import { prepare, submissionKey } from "@antumbra/domain-changes/commands/prepare.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { ChangeHostRefused } from "@antumbra/platform-change-host/port.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Clock, Effect } from "effect";
import { supportingHost } from "#changes/host.ts";
import { namedRepo, readWorld } from "#changes/read.ts";

const offBranch = (found: string, expected: string): string =>
	`This berth is on ${found}, but Antumbra provisioned it on ${expected} and opens the change from there. Check out ${expected}, bring your commits over, and try again.`;

export interface LocalChangeInput {
	readonly callId: string;
	readonly agentId: string;
	readonly sessionId: string;
	readonly pieceId: string;
	readonly repo: string;
}
export const prepareLocal = Effect.fn("changes.prepareLocal")(function* (input: LocalChangeInput) {
	const prior = (yield* readWorld).changes.find((row) => row.id === `${input.callId}:prepare`);
	if (prior !== undefined) return prior;
	const repository = yield* namedRepo(input.repo);
	const host = yield* supportingHost(repository);
	const snapshot = yield* readWorld;
	const key = submissionKey(input.agentId, repository.id);
	const berth = snapshot.berths.find((row) => row.agentId === input.agentId && row.source === repository.source);
	if (berth === undefined) return yield* new ChangeHostRefused({ host: host.tag, detail: "The agent has no berth for this repository" });
	const runner = yield* RunnerOperations;
	const captured = yield* runner.execute(berth.runner, {
		type: "CaptureChange",
		requestId: `${input.callId}:capture`,
		agentId: input.agentId,
		berth,
	});
	if (captured.type !== "ChangeCaptured")
		return yield* new ChangeHostRefused({
			host: host.tag,
			detail: captured.type === "Refused" ? captured.reason : "Runner returned no captured change evidence",
		});
	if (captured.evidence.branch !== berth.branch)
		return yield* new ChangeHostRefused({ host: host.tag, detail: offBranch(captured.evidence.branch, berth.branch) });
	const commit = yield* Commit;
	yield* commit
		.commit(prepare, {
			requestId: Request.make(`${input.callId}:prepare`),
			pieceId: PieceId.make(input.pieceId),
			repoId: repository.id,
			agentId: input.agentId,
			sessionId: input.sessionId,
			host: host.tag,
			...captured.evidence,
			capturedAt: new Date(yield* Clock.currentTimeMillis).toISOString(),
		})
		.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
	const held = (yield* readWorld).changes.find((row) => row.submissionKey === key || row.id === `${input.callId}:prepare`);
	return held === undefined ? yield* new ChangeHostRefused({ host: host.tag, detail: "Prepared change is no longer available" }) : held;
});
