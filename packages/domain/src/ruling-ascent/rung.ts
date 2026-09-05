import { Database } from "@antumbra/persistence";
import type { Ruling } from "@antumbra/rulings";
import { Effect, Option } from "effect";
import { readCaptains } from "#voyage-captain-read.ts";

const destinations = Effect.fn("RulingAscent.destinations")(function* (rulings: ReadonlyArray<Ruling>) {
	const db = yield* Database;
	const requesters = rulings.flatMap((ruling) =>
		ruling.requester.kind === "agent" && Option.contains(ruling.rung, "captain") ? [ruling.requester.agentId] : [],
	);
	const crews = yield* db.VoyageAgent.where((member) => member.agentId.in(requesters)).all();
	const flagship = rulings.some((ruling) => ruling.requester.kind === "agent" && Option.contains(ruling.rung, "flagship"))
		? yield* db.Voyage.where({ kind: "flagship" })
				.orderBy((voyage) => voyage.createdAt.asc())
				.first()
		: Option.none();
	return rulings.flatMap((ruling) => {
		const requester = ruling.requester;
		if (requester.kind !== "agent" || (!Option.contains(ruling.rung, "captain") && !Option.contains(ruling.rung, "flagship"))) {
			return [];
		}
		const voyageId = Option.contains(ruling.rung, "flagship")
			? Option.map(flagship, (voyage) => voyage.id)
			: Option.fromUndefinedOr(crews.find((crew) => crew.agentId === requester.agentId)?.voyageId);
		return Option.match(voyageId, { onNone: () => [], onSome: (id) => [[ruling.id, id] as const] });
	});
});

export const rungHolders = Effect.fn("RulingAscent.rungHolders")(function* (rulings: ReadonlyArray<Ruling>) {
	const voyages = yield* destinations(rulings);
	const captains = yield* readCaptains([...new Set(voyages.map(([, voyageId]) => voyageId))]);
	return new Map(
		voyages.flatMap(([rulingId, voyageId]) =>
			Option.match(captains.get(voyageId) ?? Option.none(), {
				onNone: () => [],
				onSome: (captain) => [[rulingId, captain.agentId] as const],
			}),
		),
	);
});
