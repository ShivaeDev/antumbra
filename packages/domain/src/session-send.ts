import {
	Database,
	type PrismaError,
	type WriteExecutors,
} from "@antumbra/persistence";
import type { BackendFailure } from "@antumbra/plugin-api";
import { SessionFabric } from "@antumbra/session-fabric";
import {
	decodeStoredAgentSessionStatus,
	type InvalidSessionExecutionStatus,
	type InvalidSessionExecutionTransition,
	type StoredAgentSessionStatusInvalid,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { makeCurrentSessionRecovery } from "#current-session-recovery.ts";
import { SessionEnded, SessionNotFound } from "#errors.ts";
import { KernelReach, type RouseRefused } from "#kernel-reach.ts";
import {
	makeRefuseSubsessionAttach,
	type SubsessionAttachRefused,
} from "#session-attach-roots.ts";
import { watchWake } from "#session-wake-watch.ts";

export type SessionSendRefused =
	| BackendFailure
	| InvalidSessionExecutionStatus
	| InvalidSessionExecutionTransition
	| PrismaError
	| RouseRefused
	| SessionEnded
	| SessionNotFound
	| StoredAgentSessionStatusInvalid
	| SubsessionAttachRefused;

// why: the admiral speaks to a Session, and the Session's state decides how the
// words get there rather than whether they may. One that is attached — working
// or listening with nothing to do — is handed them now. One whose process has
// been reclaimed is resumed through the same machinery a hail uses, carrying
// the words as the thing to say on arrival, so waking and speaking stay one
// act with no separate control for the admiral to find. Only a Session that has
// ended refuses, because there is nothing left to wake.
export const makeSessionSend = Effect.gen(function* () {
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
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	// why: the wake is written after the words are taken, never before — a row
	// claiming a Session is executing when the handover failed is durable truth
	// nobody can see is false.
	const deliver = (sessionId: string, text: string) =>
		fabric
			.send(sessionId, text)
			.pipe(Effect.andThen(recovery.awaken(sessionId)));
	const rouse = (sessionId: string, text: string) =>
		reach.rouseSession({ message: text, sessionId }).pipe(
			Effect.flatMap((wake) =>
				Effect.forkIn(
					watchWake(sessionId, wake).pipe(
						Effect.provideService(Database, db),
						provide,
					),
					scope,
				),
			),
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
		});
	return (
		sessionId: string,
		text: string,
	): Effect.Effect<void, SessionSendRefused> =>
		Effect.gen(function* () {
			yield* open(sessionId);
			if (!(yield* fabric.holds(sessionId))) {
				return yield* rouse(sessionId, text);
			}
			// why: the attachment can go between being seen and being spoken to —
			// a reclaim settling in the same breath — and the words follow it into
			// the resume rather than being reported as a refusal.
			yield* deliver(sessionId, text).pipe(
				Effect.catchTag("SessionNotLive", () => rouse(sessionId, text)),
			);
		});
});
