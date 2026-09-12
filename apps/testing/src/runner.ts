import { basename } from "node:path";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { LogEntry, Registration } from "@antumbra/platform-runner/log.ts";
import type { OperationResult } from "@antumbra/platform-runner/operations.ts";
import { RunnerRpc } from "@antumbra/platform-runner/rpc.ts";
import type { ToolCall } from "@antumbra/platform-runner/tools.ts";
import { Effect, Queue, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import * as RpcTest from "effect/unstable/rpc/RpcTest";
import { eventually } from "#answers.ts";
import { ScriptedArtifacts } from "#artifacts.ts";

export type { LogEntry } from "@antumbra/platform-runner/log.ts";

export const connectRunner = Effect.fn("TestRunner.connect")(function* (registration: Registration) {
	const calls = yield* RpcTest.makeClient(RunnerRpc, { flatten: true });
	const operations = yield* RunnerOperations;
	const reactivity = yield* Reactivity;
	const { source } = yield* ScriptedArtifacts;
	const incoming = yield* calls("runner.operations", registration).pipe(
		Stream.filterEffect((operation) => {
			if (operation.type !== "ReadArtifact") return Effect.succeed(true);
			const content = source.get(operation.relativePath);
			return calls("runner.reply", {
				runnerId: registration.runnerId,
				requestId: operation.requestId,
				result:
					content === undefined
						? { type: "Refused", reason: "source file is missing" }
						: { type: "ArtifactRead", name: basename(operation.relativePath), content },
			}).pipe(Effect.as(false));
		}),
		Stream.toQueue({ capacity: "unbounded" }),
	);
	yield* eventually(reactivity.stream(["runner:connected"], operations.connected), (connected) =>
		connected.some((runner) => runner.runnerId === registration.runnerId && runner.logId === registration.logId),
	);
	return {
		next: Queue.take(incoming),
		reply: (requestId: string, result: OperationResult) => calls("runner.reply", { runnerId: registration.runnerId, requestId, result }),
		append: (entries: readonly LogEntry[]) => calls("runner.append", { logId: registration.logId, entries }),
		cursor: calls("runner.cursor", { logId: registration.logId }),
		tool: (call: ToolCall) => calls("runner.tool", call),
	};
});
