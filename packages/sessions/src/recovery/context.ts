import { Database } from "@antumbra/persistence";
import { Effect, Option, Result } from "effect";
import { recoveryHeld } from "#recovery/error.ts";
import { makeSessionRecoveryState } from "#recovery/state.ts";

export interface SessionIdentity {
	readonly agentId: string;
	readonly pieceId: Option.Option<string>;
	readonly sessionId: string;
	readonly voyageId: Option.Option<string>;
}

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
	const oneAssignment = (kind: "Piece" | "Voyage", sessionId: string, ids: ReadonlyArray<string>) => {
		if (ids.length > 1) {
			return Effect.fail(recoveryHeld(`${sessionId} has ambiguous current ${kind} authority`));
		}
		return Effect.succeed(Option.fromUndefinedOr(ids[0]));
	};
	const authorityFor = (agentId: string, sessionId: string) =>
		Effect.gen(function* () {
			const pieces = yield* db.PieceAgent.where({ agentId }).all();
			const voyages = yield* db.VoyageAgent.where({ agentId }).all();
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
			const session = yield* state.resumableSession(sessionId);
			if (Result.isFailure(session)) {
				return Result.fail(session.failure);
			}
			const row = session.success;
			const agent = yield* state.aliveAgent(row.agentId);
			if (Result.isFailure(agent)) {
				return Result.fail(agent.failure);
			}
			yield* state.ensureResources(row.agentId, row.cwd, sessionId);
			if (row.nativeRef === null) {
				return yield* recoveryHeld(`${sessionId} has no provider-native reference`);
			}
			const authority = yield* authorityFor(row.agentId, sessionId);
			return Result.succeed<SessionRecoveryContext>({
				backend: row.backend,
				cwd: row.cwd,
				identity: { agentId: row.agentId, sessionId, ...authority },
				nativeRef: row.nativeRef,
				role: agent.success.role,
			});
		});
});
