import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { Effect } from "effect";
import { agentReading } from "#rows/agent-reading.ts";
import { captainReading } from "#rows/captain-reading.ts";
export const captainReadings = projection("captainReadings", {
	reads: [agentReading, voyage],
	writes: [captainReading],
	run: Effect.fn("Agents.captainReadings")(function* (reads, writes) {
		const captains = (yield* reads.agentReading.where({ role: "captain" }))
			.filter((held) => held.pieceIds.length === 0)
			.toSorted((a, b) => a.createdAt.localeCompare(b.createdAt));
		for (const held of yield* reads.voyage.where({})) {
			const candidates = captains.filter((candidate) => candidate.voyageIds.includes(held.id));
			const captain = candidates.find((candidate) => candidate.atWork) ?? candidates.at(-1);
			const value = {
				voyageId: held.id,
				agentId: captain?.id ?? null,
				currentSessionId: captain?.currentSessionId ?? null,
				status: captain?.status ?? null,
				standing: captain?.standing ?? "Not hailed",
				atWork: captain?.atWork ?? false,
				canHail: captain?.status !== "spawning",
			};
			if (yield* writes.captainReading.exists(held.id)) yield* writes.captainReading.update(held.id, value);
			else yield* writes.captainReading.insert(value);
		}
	}),
});
