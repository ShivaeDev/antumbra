import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import type { Input } from "@antumbra/platform-runner/input.ts";
import type { SessionOptions } from "@antumbra/platform-runner/operations.ts";
import { Context, Effect, Layer } from "effect";
import { input } from "#sessions/execution/input.ts";
import { options } from "#sessions/execution/options.ts";
export class SessionExecution extends Context.Service<
	SessionExecution,
	{
		readonly options: (root: typeof session.Row.Type) => Effect.Effect<SessionOptions>;
		readonly input: (inputId: string, sessionId: string) => Effect.Effect<Input>;
	}
>()("@antumbra/domain-sessions/SessionExecution") {}

export const execution = Layer.effect(
	SessionExecution,
	Effect.gen(function* () {
		const context = yield* Effect.context<Effect.Services<ReturnType<typeof options>> | Effect.Services<ReturnType<typeof input>>>();
		return {
			options: (root) => options(root).pipe(Effect.provideContext(context)),
			input: (inputId, sessionId) => input(inputId, sessionId).pipe(Effect.provideContext(context)),
		};
	}),
);
