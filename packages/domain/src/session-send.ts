import { Database } from "@antumbra/persistence";
import type { AgentPrompt } from "@antumbra/prompts";
import { SessionFabric } from "@antumbra/session-fabric";
import { decodeStoredAgentSessionStatus } from "@antumbra/vocabulary/agent-runtime";
import type { SessionInputId } from "@antumbra/vocabulary/session-input";
import { Effect, Option } from "effect";
import { makeCurrentSessionRecovery } from "#current-session-recovery.ts";
import { SessionEnded, SessionNotFound } from "#errors.ts";
import { KernelReach, type SessionRouse } from "#kernel-reach.ts";
import { makeRefuseSubsessionAttach } from "#session-attach-roots.ts";
import { promptInput } from "#session-input.ts";
import { makeSendInput } from "#session-send-input.ts";
import { SessionWakePatience } from "#session-wake-patience.ts";
import { watchWake } from "#session-wake-watch.ts";

export type {
	SessionSendReceipt,
	SessionSendRefused,
} from "#session-send-errors.ts";

// why: the admiral speaks to a Session, and the Session's state decides how the
// words get there rather than whether they may. One that is attached — working
// or listening with nothing to do — is handed them now. One whose process has
// been reclaimed is resumed through the same machinery a hail uses, carrying
// the words as the thing to say on arrival, so waking and speaking stay one
// act with no separate control for the admiral to find. Only a Session that has
// ended refuses, because there is nothing left to wake.
export const makeSessionSend = (imageInputBackends: ReadonlySet<string>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const fabric = yield* SessionFabric;
		const reach = yield* KernelReach;
		const recovery = yield* makeCurrentSessionRecovery;
		const refuseSubsession = yield* makeRefuseSubsessionAttach;
		// why: the watch outlives the send that started it — the mutation returns as
		// soon as the wake is on the record, and what happens to it afterwards is
		// exactly the part nobody was reading. It belongs to the seam's own lifetime
		// rather than to one request's.
		const scope = yield* Effect.scope;
		// why: the watch warns ahead of the bound the wake is actually measured
		// against, so it reads that bound here — where the Intent that enforces it
		// reads its own — rather than from whatever fiber happens to run the watch.
		const patience = yield* SessionWakePatience;
		const watch = (sessionId: string, wake: SessionRouse) =>
			Effect.forkIn(
				watchWake(sessionId, wake, patience).pipe(
					Effect.provideService(Database, db),
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
				const session = yield* db.AgentSession.where({ id: sessionId }).first();
				if (Option.isNone(session)) {
					return yield* new SessionNotFound({ sessionId });
				}
				yield* refuseSubsession(sessionId);
				const status = yield* Effect.fromResult(
					decodeStoredAgentSessionStatus(sessionId, session.value.status),
				);
				if (status !== "open") {
					// why: refusing here is also the moment the system learns this
					// Session is over, and any wake still parked for it is carrying
					// words nothing can ever deliver. They are settled on the way out,
					// so a demand that cannot be met never keeps looking pending.
					yield* reach.settleWakes(sessionId);
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
				// why: the attachment can go between being seen and being spoken to —
				// a reclaim settling in the same breath — and the words follow it into
				// the resume rather than being reported as a refusal.
				yield* fabric
					.send(sessionId, promptInput(prompt))
					.pipe(
						Effect.catchTag("SessionNotLive", () =>
							rousePrompt(sessionId, prompt),
						),
					);
				// why: the wake is written after the words are taken, never before — a
				// row claiming a Session is executing when the handover failed is
				// durable truth nobody can see is false.
				yield* recovery.awaken(sessionId);
			});
		const sendInput = yield* makeSendInput(
			imageInputBackends,
			open,
			rouseInput,
		);
		return { sendInput, sendPrompt };
	});
