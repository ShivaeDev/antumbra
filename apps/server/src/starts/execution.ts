import { hold } from "@antumbra/domain-starts/commands/hold.ts";
import type { start } from "@antumbra/domain-starts/rows/start.ts";
import { RunnerOperations } from "@antumbra/platform-runner/dispatch.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Context, Effect, Option, Schema, Stream } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";

export class StartHeld extends Schema.TaggedError<StartHeld>()("StartHeld", { reason: Schema.String }) {}

export class StartExecution extends Context.Service<
	StartExecution,
	{
		readonly prepare: (birth: typeof start.Row.Type, runnerId: string) => Effect.Effect<string, StartHeld>;
	}
>()("@antumbra/domain-starts/StartExecution") {}

export const execute = Effect.fn("Starts.execute")(function* (birth: typeof start.Row.Type) {
	const runners = yield* RunnerOperations;
	const edge = yield* StartExecution;
	const reactivity = yield* Reactivity;
	const commit = yield* Commit;
	const handoff = Effect.gen(function* () {
		const runner = yield* reactivity.stream(["runner:connected"], runners.connected).pipe(
			Stream.map((connected) => connected.find((candidate) => candidate.backends.includes(birth.backend))),
			Stream.filter((candidate) => candidate !== undefined),
			Stream.runHead,
			Effect.map(Option.getOrThrow),
		);
		const cwd = yield* edge.prepare(birth, runner.runnerId);
		const result = yield* runners.execute(runner.runnerId, {
			type: "Start",
			requestId: birth.operationRequestId,
			sessionId: birth.sessionId,
			options: {
				agentId: birth.agentId,
				backend: birth.backend,
				model: birth.model,
				effort: birth.effort,
				cwd,
				constrainedPrompt: null,
				toolSet: { version: birth.toolSetVersion, tools: birth.tools },
			},
			charter: { id: `${birth.id}:charter`, parts: [{ type: "text", text: birth.charter }] },
		});
		if (result.type === "Refused") return yield* new StartHeld({ reason: result.reason });
	});
	yield* handoff.pipe(
		Effect.catchTag("StartHeld", (failure) =>
			commit
				.commit(hold, {
					requestId: Request.make(`${birth.operationRequestId}:held`),
					id: birth.id,
					reason: failure.reason,
				})
				.pipe(Effect.catchTags({ AlreadyDone: () => Effect.void, Unavailable: () => Effect.void })),
		),
	);
});
