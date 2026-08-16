import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure } from "@antumbra/plugin-api";
import { Context, type Effect } from "effect";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import type { SessionRecoveryHeld } from "#session-recovery-error.ts";

export class SessionRecoveryRuntime extends Context.Service<
	SessionRecoveryRuntime,
	{
		readonly resume: (
			context: SessionRecoveryContext,
		) => Effect.Effect<
			void,
			BackendFailure | PrismaError | SessionRecoveryHeld
		>;
	}
>()("@antumbra/domain/SessionRecoveryRuntime") {}
