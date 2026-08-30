import { Kernel } from "@antumbra/kernel";
import { Effect } from "effect";
import { AgentDomain } from "#agent-domain-service.ts";
import type { BackendCapacities } from "#backend-capacity.ts";
import type { ReadyPiece } from "#dispatch-policy.ts";
import { type DispatchPort, dispatchPiece } from "#dispatch-spawn.ts";
import type { AssignedExecution } from "#voyage-execution-selection.ts";

export interface PendingDispatches {
	readonly pieceIds: Set<string>;
	readonly sessionIds: Set<string>;
}

export const pendingDispatches = Effect.gen(function* () {
	const domain = yield* AgentDomain;
	const kernel = yield* Kernel;
	const [spawns, wakes] = yield* Effect.all([kernel.active(domain.spawn), kernel.active(domain.wake)], { concurrency: 1 });
	return {
		pieceIds: new Set(spawns.flatMap((intent) => (intent.payload.pieceId === undefined ? [] : [intent.payload.pieceId]))),
		sessionIds: new Set(wakes.map((intent) => intent.payload.sessionId)),
	} satisfies PendingDispatches;
});

const available = (capacities: BackendCapacities, backend: string) =>
	Effect.map(capacities.current(backend), (capacity) => capacity.status !== "blocked");

export const dispatchCandidate = (
	port: DispatchPort,
	candidate: ReadyPiece,
	assigned: AssignedExecution,
	budget: number,
	capacities: BackendCapacities,
	pending: PendingDispatches,
) =>
	Effect.gen(function* () {
		if (assigned._tag === "unavailable") {
			yield* Effect.logWarning("assigned Agent has no idle current Session", {
				agentId: assigned.agentId,
				pieceId: candidate.piece.id,
			});
			return budget;
		}
		if (assigned._tag === "resume") {
			if (pending.sessionIds.has(assigned.sessionId) || !(yield* available(capacities, assigned.backend))) {
				return budget;
			}
			yield* dispatchPiece(port, candidate, {
				_tag: "resume",
				sessionId: assigned.sessionId,
			}).pipe(
				Effect.annotateSpans({
					agentId: assigned.agentId,
					pieceId: candidate.piece.id,
					sessionId: assigned.sessionId,
				}),
			);
			pending.sessionIds.add(assigned.sessionId);
			return budget;
		}
		if (budget <= 0 || pending.pieceIds.has(candidate.piece.id) || !(yield* available(capacities, candidate.voyage.crewBackend))) {
			return budget;
		}
		yield* dispatchPiece(port, candidate, { _tag: "spawn" }).pipe(Effect.annotateSpans({ pieceId: candidate.piece.id }));
		pending.pieceIds.add(candidate.piece.id);
		return budget - 1;
	});
