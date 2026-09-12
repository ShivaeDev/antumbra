import { prepare, submissionKey } from "@antumbra/domain-changes/commands/prepare.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { ChangeHostRefused } from "@antumbra/platform-change-host/port.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Clock, Effect } from "effect";
import { claimingHost } from "#changes/host.ts";
import { namedRepo, readWorld } from "#changes/read.ts";
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
	const host = yield* claimingHost(repository);
	const snapshot = yield* readWorld;
	const key = submissionKey(input.agentId, repository.id);
	const existing = snapshot.changes.find((row) => row.submissionKey === key);
	const berth = snapshot.berths.find((row) => row.agentId === input.agentId && row.source === repository.source);
	if (berth === undefined) return yield* new ChangeHostRefused({ host: host.tag, detail: "The agent has no berth for this repository" });
	const runner = yield* RunnerOperations;
	const captured =
		existing === undefined
			? yield* runner.execute(berth.runner, { type: "CaptureChange", requestId: `${input.callId}:capture`, agentId: input.agentId, berth })
			: {
					type: "ChangeCaptured" as const,
					evidence: {
						branch: existing.preparedHeadRef ?? existing.headRef,
						headSha: existing.preparedHeadSha ?? existing.headSha ?? "",
						workingDiff: existing.workingDiff ?? "",
						workingTreeStatus: existing.workingTreeStatus ?? "",
						worktreePath: existing.worktreePath ?? berth.path,
					},
				};
	if (captured.type !== "ChangeCaptured")
		return yield* new ChangeHostRefused({
			host: host.tag,
			detail: captured.type === "Refused" ? captured.reason : "Runner returned no captured change evidence",
		});
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
