import type { PrismaError } from "@antumbra/persistence";
import type { BackendFailure, SessionInput } from "@antumbra/plugin-api";
import type { SessionStartPermit } from "@antumbra/session-fabric";
import { Context, type Effect } from "effect";
import type { SessionRecoveryContext } from "#recovery/context.ts";
import type { SessionRecoveryHeld } from "#recovery/error.ts";

export class SessionRecoveryRuntime extends Context.Service<
	SessionRecoveryRuntime,
	{
		readonly resume: (
			permit: SessionStartPermit,
			context: SessionRecoveryContext,
			instruction: SessionInput,
		) => Effect.Effect<void, BackendFailure | PrismaError | SessionRecoveryHeld>;
	}
>()("@antumbra/sessions/SessionRecoveryRuntime") {}
