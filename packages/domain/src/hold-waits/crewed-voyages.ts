import { Database } from "@antumbra/persistence";
import { Effect } from "effect";

export const crewedVoyages = Effect.fn("HoldWaits.crewedVoyages")(function* (agentIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const crewed = yield* db.VoyageAgent.where((crew) => crew.agentId.in(agentIds)).all();
	const voyages = yield* db.Voyage.where((voyage) => voyage.id.in(crewed.map((crew) => crew.voyageId))).all();
	const names = new Map(voyages.map((voyage) => [voyage.id, voyage.name] as const));
	return new Map(
		crewed.flatMap((crew) => {
			const name = names.get(crew.voyageId);
			return name === undefined ? [] : [[crew.agentId, name] as const];
		}),
	);
});
