import type { LogEntry } from "@antumbra/platform-runner/log.ts";
import type { Operation, OperationResult } from "@antumbra/platform-runner/operations.ts";
import { RunnerLog } from "@antumbra/runner-fabric/log.ts";
import type { GitPushRefused } from "@antumbra/runner-git/errors.ts";
import { pushBranch } from "@antumbra/runner-git/push.ts";
import { toRunnerError } from "@antumbra/runner-git/resources/git-runtime.ts";
import type { RunnerError } from "@antumbra/runner-git/resources/model.ts";
import { NodeServices } from "@effect/platform-node";
import { Effect, Layer } from "effect";
import { readArtifact } from "#adapters/artifacts.ts";
import type { FileFailure } from "#adapters/file-error.ts";
import { gitProcess } from "#adapters/git.ts";
import type { LocalRunner } from "#resources.ts";

type ResourceOperation = Extract<
	Operation,
	{ type: "Plan" | "Provision" | "Reclaim" | "Scrap" | "CaptureChange" | "PushChange" | "ReadArtifact" | "ReadLog" }
>;

const completed = (operation: ResourceOperation, history: ReadonlyArray<LogEntry>): OperationResult | undefined => {
	for (const { event } of history) {
		if (event.type === "MoorageProvisioned" || event.type === "ChangePushed") return { type: "Accepted" };
		if (event.type === "BerthReclaimed" && (operation.type === "Scrap" || operation.type === "Reclaim") && event.slug === operation.berth.slug) {
			return operation.type === "Scrap" ? { type: "Accepted" } : { type: "Reclaimed", verdict: "reclaimed" };
		}
		if (event.type === "ChangeCaptured") return { type: "ChangeCaptured", evidence: event.evidence };
	}
	return undefined;
};

export const resourceOperations = (resources: LocalRunner) =>
	Effect.gen(function* () {
		const log = yield* RunnerLog;
		const execute = Effect.fn("Runner.resources")(function* (
			operation: ResourceOperation,
		): Effect.fn.Return<OperationResult, RunnerError | FileFailure | GitPushRefused> {
			switch (operation.type) {
				case "Plan":
					return { type: "MooragePlanned", plan: resources.plan(operation) };
				case "ReadArtifact":
					return yield* readArtifact(operation.moorageRoot, operation.relativePath);
				case "ReadLog":
					return { type: "LogRead", entries: yield* log.read(operation.after) };
				case "Provision":
					yield* resources.provision(operation.plan);
					yield* log.append({ type: "MoorageProvisioned", requestId: operation.requestId, agentId: operation.agentId, plan: operation.plan });
					return { type: "Accepted" };
				case "Reclaim": {
					const verdict = yield* resources.reclaim(operation.berth);
					yield* log.append(
						verdict._tag === "reclaimed"
							? { type: "BerthReclaimed", requestId: operation.requestId, agentId: operation.agentId, slug: operation.berth.slug }
							: {
									type: "BerthReclaimHeld",
									requestId: operation.requestId,
									agentId: operation.agentId,
									slug: operation.berth.slug,
									reason: "dirty or unpushed work",
								},
					);
					return { type: "Reclaimed", verdict: verdict._tag };
				}
				case "Scrap":
					yield* resources.scrap(operation.berth);
					yield* log.append({ type: "BerthReclaimed", requestId: operation.requestId, agentId: operation.agentId, slug: operation.berth.slug });
					return { type: "Accepted" };
				case "CaptureChange": {
					const evidence = yield* resources.captureChange(operation.berth);
					yield* log.append({ type: "ChangeCaptured", requestId: operation.requestId, evidence });
					return { type: "ChangeCaptured", evidence };
				}
				case "PushChange":
					yield* pushBranch(operation.berth.path, operation.berth.branch, operation.headSha).pipe(
						Effect.provide(gitProcess.pipe(Layer.provide(NodeServices.layer))),
						Effect.mapError((error) => (error._tag === "GitPushRefused" ? error : toRunnerError(error))),
					);
					yield* log.append({
						type: "ChangePushed",
						requestId: operation.requestId,
						agentId: operation.agentId,
						branch: operation.berth.branch,
						headSha: operation.headSha,
					});
					return { type: "Accepted" };
			}
		});
		return (operation: ResourceOperation) =>
			Effect.flatMap(log.request(operation.requestId), (history) => {
				const result = completed(operation, history);
				return result === undefined ? execute(operation) : Effect.succeed(result);
			}).pipe(
				Effect.catch((failure) =>
					log
						.append(
							operation.type === "Reclaim"
								? {
										type: "BerthReclaimFailed",
										requestId: operation.requestId,
										agentId: operation.agentId,
										slug: operation.berth.slug,
										reason: failure.message,
									}
								: { type: "ResourceFailed", requestId: operation.requestId, reason: failure.message },
						)
						.pipe(Effect.as({ type: "Refused" as const, reason: failure.message })),
				),
			);
	});
