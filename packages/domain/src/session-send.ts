import { Database, type WriteExecutors } from "@antumbra/persistence";
import type { SessionInput } from "@antumbra/plugin-api";
import type { AgentPrompt } from "@antumbra/prompts";
import { SessionFabric } from "@antumbra/session-fabric";
import { SessionInputNotFound, SessionInputs } from "@antumbra/session-inputs";
import { decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect, Option } from "effect";
import { makeCurrentSessionRecovery } from "#current-session-recovery.ts";
import { SessionEnded, SessionNotFound } from "#errors.ts";
import { KernelReach, type SessionRouse } from "#kernel-reach.ts";
import { makeRefuseSubsessionAttach } from "#session-attach-roots.ts";
import { admiralInput, promptInput } from "#session-input.ts";
import { makeSessionInputAdmission } from "#session-input-admission.ts";
import type { SessionSendReceipt } from "#session-send-errors.ts";
import { watchWake } from "#session-wake-watch.ts";

export type {
	SessionSendReceipt,
	SessionSendRefused,
} from "#session-send-errors.ts";

export const makeSessionSend = (imageInputBackends: ReadonlySet<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const fabric = yield* SessionFabric;
		const inputs = yield* SessionInputs;
		const admission = yield* makeSessionInputAdmission(imageInputBackends);
		const reach = yield* KernelReach;
		const recovery = yield* makeCurrentSessionRecovery;
		const refuseSubsession = yield* makeRefuseSubsessionAttach;
		const scope = yield* Effect.scope;
		const executors = yield* Effect.context<WriteExecutors>();
		const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
			Effect.provideContext(effect, executors);
		const watch = (sessionId: string, wake: SessionRouse) =>
			Effect.forkIn(
				watchWake(sessionId, wake).pipe(
					Effect.provideService(Database, db),
					provide,
				),
				scope,
			);
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
				const session = yield* provide(
					db.AgentSession.where({ id: sessionId }).first(),
				);
				if (Option.isNone(session)) {
					return yield* new SessionNotFound({ sessionId });
				}
				yield* refuseSubsession(sessionId);
				const status = yield* Effect.fromResult(
					decodeStoredAgentSessionStatus(sessionId, session.value.status),
				);
				if (status !== "open") {
					return yield* new SessionEnded({ sessionId });
				}
				return session.value;
			});
		const sendPrompt = (sessionId: string, prompt: AgentPrompt) =>
			Effect.gen(function* () {
				yield* open(sessionId);
				if (!(yield* fabric.holds(sessionId))) {
					return yield* rousePrompt(sessionId, prompt);
				}
				yield* fabric
					.send(sessionId, promptInput(prompt))
					.pipe(
						Effect.catchTag("SessionNotLive", () =>
							rousePrompt(sessionId, prompt),
						),
					);
				yield* recovery.awaken(sessionId);
			});
		const accepted = (
			sessionId: string,
			inputId: SessionInputId,
			input: SessionInput,
		) => {
			const afterHandoff = recovery.awaken(sessionId).pipe(
				Effect.andThen(inputs.mark(inputId, "accepted")),
				Effect.as<SessionSendReceipt>("accepted"),
				// why: once the provider accepted the input, a later database failure
				// loses receipt certainty. Persist ambiguity before exposing that error so
				// an explicit retry cannot blindly duplicate the logical message.
				Effect.tapError(() => inputs.mark(inputId, "ambiguous")),
			);
			return fabric.send(sessionId, input).pipe(
				Effect.andThen(afterHandoff),
				Effect.tapErrorTag("BackendFailure", () =>
					inputs.mark(inputId, "ambiguous"),
				),
			);
		};
		const queued = (sessionId: string, inputId: SessionInputId) =>
			rouseInput(sessionId, inputId).pipe(
				Effect.andThen(inputs.mark(inputId, "queued_for_wake")),
				Effect.as<SessionSendReceipt>("queued_for_wake"),
			);
		const sendInput = (sessionId: string, inputId: SessionInputId) =>
			Effect.gen(function* () {
				const session = yield* open(sessionId);
				const stored = yield* inputs.load(inputId);
				if (stored.sessionId !== sessionId) {
					return yield* new SessionInputNotFound({ inputId });
				}
				const input = admiralInput(stored.input);
				const replay = yield* admission.replayed(stored.status, inputId);
				if (replay !== undefined) {
					return replay;
				}
				yield* admission.admit(session.backend, inputId, input);
				if (!(yield* fabric.holds(sessionId))) {
					return yield* queued(sessionId, inputId);
				}
				return yield* accepted(sessionId, inputId, input).pipe(
					Effect.catchTag("SessionNotLive", () => queued(sessionId, inputId)),
				);
			});
		return { sendInput, sendPrompt };
	});
