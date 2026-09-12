import type { Registration } from "@antumbra/platform-runner/log.ts";
import type { Operation, OperationResult } from "@antumbra/platform-runner/operations.ts";
import { RunnerFabric } from "@antumbra/runner-fabric/fabric.ts";
import { RunnerLog } from "@antumbra/runner-fabric/log.ts";
import { Deferred, Effect, Scope, Stream } from "effect";
import { listModels } from "#catalogue.ts";
import { connected, RunnerClient } from "#connection.ts";
import { flushLog } from "#publish.ts";
import { resourceOperations } from "#resource-operations.ts";
import type { LocalRunner } from "#resources.ts";

export const runRunner = (registration: Registration, resources: LocalRunner) =>
	Effect.gen(function* () {
		const { calls } = yield* RunnerClient;
		const log = yield* RunnerLog;
		const fabric = yield* RunnerFabric;
		const scope = yield* Scope.Scope;
		const machine = yield* resourceOperations(resources);
		const execute = (operation: Operation) => {
			switch (operation.type) {
				case "Plan":
				case "Provision":
				case "Reclaim":
				case "Scrap":
				case "CaptureChange":
				case "PushChange":
				case "ReadArtifact":
				case "ReadLog":
					return machine(operation);
				case "ListModels":
					return listModels(operation);
				default:
					return fabric.execute(operation);
			}
		};

		const pending = new Map<string, Deferred.Deferred<OperationResult>>();
		const cycle = Effect.gen(function* () {
			const cursor = yield* flushLog();
			const publish = log.events(cursor).pipe(Stream.runForEach((entry) => calls["runner.append"]({ logId: registration.logId, entries: [entry] })));
			const operations = calls["runner.operations"](registration).pipe(
				Stream.runForEach((operation) =>
					Effect.gen(function* () {
						let result = pending.get(operation.requestId);
						if (result === undefined) {
							result = yield* Deferred.make<OperationResult>();
							pending.set(operation.requestId, result);

							yield* execute(operation).pipe(Deferred.into(result), Effect.forkIn(scope));
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
