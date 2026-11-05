import { selection as agentReadingSelection } from "@antumbra/server-storage/records/agent-reading.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const captainReadings = Effect.fn("Agents.captainReadings")(function* (): Effect.fn.Return<void, never, Records> {
	const reads = yield* Records;
	const writes = yield* Records;

	const captains = (yield* reads.agentReading
		.findMany({ where: { role: "captain" }, orderBy: { field: "storage_order", direction: "asc" }, select: agentReadingSelection })
		.pipe(Effect.orDie))
		.filter((held) => held.pieceIds.length === 0)
		.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
	for (const held of yield* reads.voyage
		.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection })
		.pipe(Effect.orDie)) {
		const candidates = captains.filter((candidate) => candidate.voyageIds.includes(held.id));
		const captain = candidates.find((candidate) => candidate.atWork) ?? candidates.at(-1);
		const value = {
			voyageId: held.id,
			agentId: captain?.id ?? null,
			currentSessionId: captain?.currentSessionId ?? null,
			status: captain?.status ?? null,
			standing: captain?.standing ?? "Not hailed",
			atWork: captain?.atWork ?? false,
			canHail: captain?.status !== "spawning" && captain?.atWork !== true,
		};
		if (
			yield* writes.captainReading.count({ where: { voyageId: held.id } }).pipe(
				Effect.map((count) => count > 0),
				Effect.orDie,
			)
		)
			yield* writes.captainReading.updateVoid({ ...value, voyageId: held.id }).pipe(Effect.orDie);
		else yield* writes.captainReading.insertVoid(value).pipe(Effect.orDie);
	}
});
