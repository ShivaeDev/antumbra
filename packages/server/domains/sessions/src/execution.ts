import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import type { Input } from "@antumbra/platform-runner/input.ts";
import type { Operation, SessionOptions } from "@antumbra/platform-runner/operations.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Context, Effect, Option, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import { hold } from "#commands/hold.ts";
import { reading } from "#queries/reading.ts";
import type { session } from "#rows/session.ts";
import type { sessionOperation } from "#rows/session-operation.ts";

export class SessionExecution extends Context.Service<
	SessionExecution,
	{
		readonly options: (root: typeof session.Row.Type) => Effect.Effect<SessionOptions>;
		readonly input: (inputId: string) => Effect.Effect<Input>;
	}
>()("@antumbra/domain-sessions/SessionExecution") {}

export const execute = Effect.fn("sessions.execute")(function* (operation: typeof sessionOperation.Row.Type) {
	const live = yield* Live;
	const commit = yield* Commit;
	const edge = yield* SessionExecution;
	const runners = yield* RunnerOperations;
	const root = yield* live.read(reading, { id: operation.sessionId });
	if (root === null) return;
	const reactivity = yield* Reactivity;
	const available = reactivity
		.stream(["runner:connected"], runners.connected)
		.pipe(Stream.filter((registrations) => registrations.some((runner) => runner.backends.includes(root.backend))));
	const connected = yield* Stream.runHead(available).pipe(Effect.map(Option.getOrThrow));
	const previous = connected.find((runner) => runner.runnerId === root.runnerId);
	const runner = previous ?? connected.find((runner) => runner.backends.includes(root.backend));
	if (runner === undefined) return;
	const attached = root.attached && previous !== undefined;
	const identity = { requestId: operation.id, sessionId: root.id };
	let wire: Operation;
	switch (operation.kind) {
		case "interrupt":
			wire = { type: "Interrupt", ...identity };
			break;
		case "sleep":
			wire = { type: "Sleep", ...identity };
			break;
		case "stop":
			wire = { type: "Stop", ...identity, reason: operation.reason };
			break;
		case "wake":
		case "steer": {
			const input: Input =
				operation.inputId === null ? { id: operation.id, parts: [{ type: "text", text: operation.reason }] } : yield* edge.input(operation.inputId);
			if (attached) wire = { type: "Deliver", ...identity, act: "steer", input };
			else {
				if (root.nativeRef === null) {
					yield* commit
						.commit(hold, {
							requestId: Request.make(`${operation.id}:held`),
							id: operation.id,
							detail: "The provider conversation has no native resume reference",
						})
						.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
					return;
				}
				wire = { type: "Wake", ...identity, nativeRef: root.nativeRef, options: yield* edge.options(root), instruction: input };
			}
			break;
		}
	}
	const result = yield* runners.execute(runner.runnerId, wire);
	if (result.type === "Refused")
		yield* commit
			.commit(hold, { requestId: Request.make(`${operation.id}:held`), id: operation.id, detail: result.reason })
			.pipe(Effect.catchTag("AlreadyDone", () => Effect.void));
});
