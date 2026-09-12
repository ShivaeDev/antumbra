import type { session } from "@antumbra/domain-sessions/rows/session.ts";
import type { Input } from "@antumbra/platform-runner/input.ts";
import type { SessionOptions } from "@antumbra/platform-runner/operations.ts";
import { Context, type Effect } from "effect";
export class SessionExecution extends Context.Service<
	SessionExecution,
	{
		readonly options: (root: typeof session.Row.Type) => Effect.Effect<SessionOptions>;
		readonly input: (inputId: string) => Effect.Effect<Input>;
	}
>()("@antumbra/domain-sessions/SessionExecution") {}
