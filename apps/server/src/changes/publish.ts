import { freeze } from "@antumbra/domain-changes/commands/freeze.ts";
import { all } from "@antumbra/domain-changes/queries/all.ts";
import type { ChangeRow } from "@antumbra/domain-changes/rows/change.ts";
import { flags } from "@antumbra/domain-settings/queries/flags.ts";
import { ChangeHostRefused } from "@antumbra/platform-change-host/port.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Clock, Effect, Option, Stream } from "effect";
import { claimingHost } from "#changes/host.ts";
import { recordObservation } from "#changes/observations.ts";
import { type LocalChangeInput, prepareLocal } from "#changes/prepare.ts";
import { readChange, readWorld } from "#changes/read.ts";
export const publish = Effect.fn("changes.publish")(function* (held: ChangeRow) {
	if (held.stage !== "prepared" || held.externalId !== null) return held;
	const snapshot = yield* readWorld;
	const repository = snapshot.repos.find((repo) => repo.id === held.repoId);
	const berth = snapshot.berths.find((row) => row.agentId === held.openedByAgentId && row.path === held.worktreePath);
	if (
		repository === undefined ||
		berth === undefined ||
		held.preparedHeadSha === null ||
		held.submissionKey === null ||
		held.openedByAgentId === null
	)
		return yield* new ChangeHostRefused({ host: held.host, detail: "Prepared change has no available repository, berth, or submission evidence" });
	const host = yield* claimingHost(repository, held.host);
	const runner = yield* RunnerOperations;
	const pushed = yield* runner.execute(berth.runner, {
		type: "PushChange",
		requestId: `${held.id}:push`,
		agentId: held.openedByAgentId,
		berth,
		headSha: held.preparedHeadSha,
	});
	if (pushed.type !== "Accepted")
		return yield* new ChangeHostRefused({
			host: held.host,
			detail: pushed.type === "Refused" ? pushed.reason : "Runner did not accept the prepared push",
		});
	const observation = yield* host.open({
		submissionId: held.id,
		repo: repository,
		berth: { branch: held.preparedHeadRef ?? held.headRef, path: berth.path },
		headSha: held.preparedHeadSha,
		base: held.baseRef,
		title: held.title,
		body: held.body,
		draft: held.draftAt !== null,
	});
	yield* recordObservation(host.tag, observation, {
		_tag: "Claimed",
		changeId: held.id,
		agentId: held.openedByAgentId,
		submissionKey: held.submissionKey,
	});
	return yield* readChange(held.id);
});
const TRAILER = "Opened through Antumbra";

export const openLocal = Effect.fn("changes.openLocal")(function* (
	input: LocalChangeInput & { readonly title: string; readonly body: string; readonly base: string | null; readonly draft: boolean },
) {
	const held = yield* prepareLocal(input);
	const commit = yield* Commit;
	const live = yield* Live;
	const chosen = yield* live.read(flags, {});
	const signing = chosen.some((flag) => flag.key === "signChanges" && flag.on);
	yield* commit
		.commit(freeze, {
			requestId: Request.make(`${input.callId}:freeze`),
			changeId: held.id,
			title: input.title,
			body: signing ? [input.body.trimEnd(), TRAILER].join("\n\n") : input.body,
			base: input.base,
			draft: input.draft,
			at: new Date(yield* Clock.currentTimeMillis).toISOString(),
		})
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	const settled = yield* live.live(all, {}).pipe(
		Stream.map((rows) => rows.find((row) => row.id === held.id)),
		Stream.filter((row): row is ChangeRow => row !== undefined && (row.stage !== "prepared" || row.publicationError !== null)),
		Stream.runHead,
	);
	const result = Option.getOrThrow(settled);
	if (result.publicationError !== null) return yield* new ChangeHostRefused({ host: result.host, detail: result.publicationError });
	return result;
});
