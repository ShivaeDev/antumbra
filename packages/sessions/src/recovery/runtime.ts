import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure, SessionInput } from "@antumbra/plugin-api";
import type { SessionStartPermit } from "@antumbra/session-fabric";
import { Context, type Effect } from "effect";
import type { SessionRecoveryContext } from "#recovery/context.ts";
import type { SessionRecoveryHeld } from "#recovery/error.ts";

export class SessionRecoveryRuntime extends Context.Service<
	SessionRecoveryRuntime,
	{
		// why: a resume always arrives carrying the one thing to say first, so
		// there is no attach that reaches a provider and then wonders what it
		// was for. Ordinary recovery says reconcile and continue; a resume the
		// admiral caused says what the admiral said. Either way the words are a
		// catalog template, which is why this seam cannot be handed a bare string.
		readonly resume: (
			permit: SessionStartPermit,
			context: SessionRecoveryContext,
			instruction: SessionInput,
		) => Effect.Effect<void, BackendFailure | PrismaError | SessionRecoveryHeld>;
	}
>()("@antumbra/sessions/SessionRecoveryRuntime") {}
