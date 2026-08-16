import { Database, type WriteExecutors } from "@antumbra/persistence";
import { Effect, Option } from "effect";
import { recoveryHeld } from "#session-recovery-error.ts";
import { makeSessionRecoveryState } from "#session-recovery-state.ts";
import type { SessionIdentity } from "#tool-identity.ts";

export interface SessionRecoveryContext {
	readonly backend: string;
	readonly cwd: string;
	readonly identity: SessionIdentity;
	readonly nativeRef: string;
	readonly role: string;
}

export const makeSessionRecoveryContext = Effect.gen(function* () {
	const db = yield* Database;
	const state = yield* makeSessionRecoveryState;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
	const oneAssignment = (
		kind: "Piece" | "Voyage",
		sessionId: string,
		ids: ReadonlyArray<string>,
	) => {
		if (ids.length > 1) {
			return Effect.fail(
				recoveryHeld(`${sessionId} has ambiguous current ${kind} authority`),
			);
		}
		return Effect.succeed(Option.fromUndefinedOr(ids[0]));
	};
	const authorityFor = (agentId: string, sessionId: string) =>
		Effect.gen(function* () {
			const pieces = yield* provide(db.PieceAgent.where({ agentId }).all());
			const voyages = yield* provide(db.VoyageAgent.where({ agentId }).all());
			return {
				pieceId: yield* oneAssignment(
					"Piece",
					sessionId,
					pieces.map((piece) => piece.pieceId),
				),
				voyageId: yield* oneAssignment(
					"Voyage",
					sessionId,
					voyages.map((voyage) => voyage.voyageId),
				),
			};
		});
	return (sessionId: string) =>
		Effect.gen(function* () {
			const session = yield* state.openSession(sessionId);
			if (Option.isNone(session)) {
				return Option.none<SessionRecoveryContext>();
			}
			const row = session.value;
			const agent = yield* state.aliveAgent(row.agentId, sessionId);
			if (Option.isNone(agent)) {
				return Option.none<SessionRecoveryContext>();
			}
			yield* state.ensureResources(row.agentId, row.cwd, sessionId);
			if (row.nativeRef === null) {
				return yield* recoveryHeld(
					`${sessionId} has no provider-native reference`,
				);
			}
			const authority = yield* authorityFor(row.agentId, sessionId);
			return Option.some({
				backend: row.backend,
				cwd: row.cwd,
				identity: { agentId: row.agentId, sessionId, ...authority },
				nativeRef: row.nativeRef,
				role: agent.value.role,
			});
		});
});
