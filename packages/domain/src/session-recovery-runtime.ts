import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure } from "@antumbra/plugin-api";
import type { SessionStartPermit } from "@antumbra/session-fabric";
import { Context, type Effect } from "effect";
import type { SessionRecoveryContext } from "#session-recovery-context.ts";
import type { SessionRecoveryHeld } from "#session-recovery-error.ts";

export class SessionRecoveryRuntime extends Context.Service<
	SessionRecoveryRuntime,
	{
		// why: a resume always arrives carrying the one thing to say first, so
		// there is no attach that reaches a provider and then wonders what it
		// was for. Ordinary recovery says reconcile and continue; a resume the
		// admiral caused says what the admiral said.
		readonly resume: (
			permit: SessionStartPermit,
			context: SessionRecoveryContext,
			instruction: string,
		) => Effect.Effect<
			void,
			BackendFailure | PrismaError | SessionRecoveryHeld
		>;
	}
>()("@antumbra/domain/SessionRecoveryRuntime") {}
