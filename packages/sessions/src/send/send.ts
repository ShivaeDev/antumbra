import { Database } from "@antumbra/persistence";
import type { AgentPrompt } from "@antumbra/prompts";
import { BackendCapacities } from "@antumbra/provider-capacity/service";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect, Option } from "effect";
import { makeRefuseSubsessionAttach } from "#attach-roots.ts";
import { makeCurrentSessionRecovery } from "#current/recovery.ts";
import { SessionEnded, SessionNotFound } from "#errors.ts";
import { promptInput } from "#input.ts";
import { SessionReach, type SessionRouse } from "#reach.ts";
import { makeSendInput } from "#send/input.ts";
import { SessionWakePatience } from "#wake/patience.ts";
import { watchWake } from "#wake/watch.ts";

export type {
	SessionSendReceipt,
	SessionSendRefused,
} from "#send/errors.ts";

export const makeSessionSend = (imageInputBackends: ReadonlySet<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const fabric = yield* SessionFabric;
		const capacities = yield* BackendCapacities;
		const reach = yield* SessionReach;
		const recovery = yield* makeCurrentSessionRecovery;
		const refuseSubsession = yield* makeRefuseSubsessionAttach;
		const scope = yield* Effect.scope;
		const patience = yield* SessionWakePatience;
		const watch = (sessionId: string, wake: SessionRouse) =>
			Effect.forkIn(watchWake(sessionId, wake, patience).pipe(Effect.provideService(Database, db)), scope);
		const rousePrompt = (sessionId: string, prompt: AgentPrompt) =>
			reach.rouseSession({ message: prompt, sessionId }).pipe(
				Effect.tap((wake) => watch(sessionId, wake)),
				Effect.asVoid,
			);
		const rouseInput = (sessionId: string, inputId: SessionInputId) =>
			reach.rouseSession({ inputId, sessionId }).pipe(
				Effect.tap((wake) => watch(sessionId, wake)),
				Effect.asVoid,
			);
		const open = (sessionId: string) =>
			Effect.gen(function* () {
				const session = yield* db.AgentSession.where({ id: sessionId }).first();
				if (Option.isNone(session)) {
					return yield* new SessionNotFound({ sessionId });
				}
				yield* refuseSubsession(sessionId);
				const status = yield* Effect.fromResult(decodeStoredAgentSessionStatus(sessionId, session.value.status));
				if (status !== "open") {
					yield* reach.settleWakes(sessionId);
					return yield* new SessionEnded({ sessionId });
				}
				return session.value;
			});
		const sendPrompt = (sessionId: string, prompt: AgentPrompt) =>
			Effect.gen(function* () {
				const session = yield* open(sessionId);
				if ((yield* capacities.current(session.backend)).status === "blocked") {
					return yield* rousePrompt(sessionId, prompt);
				}
				if (!(yield* fabric.holds(sessionId))) {
					return yield* rousePrompt(sessionId, prompt);
				}
				// An attachment may detach after `holds`; the same words then follow the wake path.
				yield* fabric.send(sessionId, promptInput(prompt)).pipe(Effect.catchTag("SessionNotLive", () => rousePrompt(sessionId, prompt)));
				// Mark execution only after provider handoff succeeds.
				yield* recovery.awaken(sessionId);
			});
		const sendInput = yield* makeSendInput(imageInputBackends, open, rouseInput);
		return { sendInput, sendPrompt };
	});
