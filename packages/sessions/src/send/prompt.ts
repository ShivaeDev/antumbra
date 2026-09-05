import type { AgentPrompt } from "@antumbra/prompts";
import { BackendCapacities } from "@antumbra/provider-capacity/service";
import { SessionFabric } from "@antumbra/session-fabric";
import { Effect, type Scope } from "effect";
import { makeCurrentSessionRecovery } from "#current/recovery.ts";
import { promptInput } from "#input.ts";
import { openSession } from "#send/open.ts";
import { rouseSession } from "#send/rouse.ts";

export const sendPrompt = (scope: Scope.Scope) =>
	Effect.fn("SessionSend.sendPrompt")(function* (sessionId: string, prompt: AgentPrompt) {
		const session = yield* openSession(sessionId);
		const capacities = yield* BackendCapacities;
		const fabric = yield* SessionFabric;
		const rouse = rouseSession(scope)({ message: prompt, sessionId });
		if ((yield* capacities.current(session.backend)).status === "blocked") {
			return yield* rouse;
		}
		if (!(yield* fabric.holds(sessionId))) {
			return yield* rouse;
		}
		// An attachment may detach after `holds`; the same words then follow the wake path.
		yield* fabric.send(sessionId, promptInput(prompt)).pipe(Effect.catchTag("SessionNotLive", () => rouse));
		const recovery = yield* makeCurrentSessionRecovery;
		yield* recovery.awaken(sessionId);
	});
