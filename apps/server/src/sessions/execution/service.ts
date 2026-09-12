import { ToolCatalog } from "@antumbra/domain-agents/ports/tool-catalog.ts";
import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import type { Input } from "@antumbra/platform-runner/input.ts";
import type { SessionOptions } from "@antumbra/platform-runner/operations.ts";
import { Live } from "@antumbra/server-journal/live.ts";
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
		const live = yield* Live;
		const catalog = yield* ToolCatalog;
		return {
			options: (root) => options(root).pipe(Effect.provideService(Live, live), Effect.provideService(ToolCatalog, catalog)),
			input: (inputId, sessionId) => input(inputId, sessionId).pipe(Effect.provideService(Live, live)),
		};
	}),
);
