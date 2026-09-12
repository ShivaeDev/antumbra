import type { Registration } from "@antumbra/platform-runner/log.ts";
import type { OperationResult } from "@antumbra/platform-runner/operations.ts";
import { RunnerFabric } from "@antumbra/runner-fabric/fabric.ts";
import { RunnerLog } from "@antumbra/runner-fabric/log.ts";
import { Deferred, Effect, Scope, Stream } from "effect";
import { connected, RunnerClient } from "#connection.ts";
import { resourceOperations } from "#resource-operations.ts";
import type { LocalRunner } from "#resources.ts";

export const runRunner = (registration: Registration, resources: LocalRunner) =>
	Effect.gen(function* () {
		const { calls } = yield* RunnerClient;
		const log = yield* RunnerLog;
		const fabric = yield* RunnerFabric;
		const scope = yield* Scope.Scope;
		const machine = yield* resourceOperations(resources);
		const pending = new Map<string, Deferred.Deferred<OperationResult>>();
		const cycle = Effect.gen(function* () {
			const cursor = yield* calls["runner.cursor"]({ logId: registration.logId });
			const publish = log.events(cursor).pipe(Stream.runForEach((entry) => calls["runner.append"]({ logId: registration.logId, entries: [entry] })));
			const operations = calls["runner.operations"](registration).pipe(
				Stream.runForEach((operation) =>
					Effect.gen(function* () {
						let result = pending.get(operation.requestId);
						if (result === undefined) {
							result = yield* Deferred.make<OperationResult>();
							pending.set(operation.requestId, result);
							const execute =
								operation.type === "Plan" ||
								operation.type === "Provision" ||
								operation.type === "Reclaim" ||
								operation.type === "Scrap" ||
								operation.type === "CaptureChange" ||
								operation.type === "PushChange" ||
								operation.type === "ReadArtifact" ||
								operation.type === "ReadLog"
									? machine(operation)
									: fabric.execute(operation);
							yield* execute.pipe(Deferred.into(result), Effect.forkIn(scope));
						}
						yield* Effect.gen(function* () {
							const value = yield* Deferred.await(result);
							yield* connected(calls["runner.reply"]({ runnerId: registration.runnerId, requestId: operation.requestId, result: value }));
							pending.delete(operation.requestId);
						}).pipe(Effect.forkIn(scope));
					}),
				),
			);
			yield* Effect.all([publish, operations], { concurrency: "unbounded" });
		});
		yield* connected(cycle);
	});
