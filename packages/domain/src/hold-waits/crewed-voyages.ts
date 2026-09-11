import { Database } from "@antumbra/persistence";
import { Voyages } from "@antumbra/voyages";
import { Effect } from "effect";

export const crewedVoyages = Effect.fn("HoldWaits.crewedVoyages")(function* (agentIds: ReadonlyArray<string>) {
	const db = yield* Database;
	const crewed = yield* db.VoyageAgent.where((crew) => crew.agentId.in(agentIds)).all();
	const sailing = yield* (yield* Voyages).list();
	const names = new Map(sailing.map((voyage) => [voyage.id, voyage.name] as const));
	return new Map(
		crewed.flatMap((crew) => {
			const name = names.get(crew.voyageId);
			return name === undefined ? [] : [[crew.agentId, name] as const];
		}),
	);
});
