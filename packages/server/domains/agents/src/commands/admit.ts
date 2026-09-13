import { capacity } from "@antumbra/domain-capacity/rows/capacity.ts";
import { pieceProgress } from "@antumbra/domain-pieces/rows/piece-progress.ts";
import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { FLEET, type SwitchKey } from "@antumbra/domain-settings/ids.ts";
import { COUNTS } from "@antumbra/domain-settings/queries/counts.ts";
import { allows, type Switched } from "@antumbra/domain-settings/queries/flags.ts";
import { count } from "@antumbra/domain-settings/rows/count.ts";
import { flag } from "@antumbra/domain-settings/rows/flag.ts";
import { voyage } from "@antumbra/domain-voyages/rows/voyage.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Option, Schema } from "effect";
import { birthAdmitted } from "#facts/birth-admitted.ts";
import { BirthId } from "#ids.ts";
import { agent } from "#rows/agent.ts";
import { birth } from "#rows/birth.ts";

const SWITCHES: Partial<Record<typeof birth.Row.Type.source, SwitchKey>> = { dispatch: "spawnForPiece", hail: "spawnOnHail" };

const switchedOn = (flags: ReadonlyArray<Switched>, value: typeof birth.Row.Type): boolean => {
	const key = SWITCHES[value.source];
	return key === undefined || allows(flags, key);
};

export const admit = command("admit", {
	input: { id: BirthId, backend: Schema.String, model: Schema.String, effort: Schema.NullOr(Schema.String) },
	reads: [pieceProgress, birth, agent, session, count, flag, capacity, voyage],
	emits: birthAdmitted,
	rejections: {
		NotEligible: { id: Schema.String },
		Unknown: { id: Schema.String },
		NotRequested: { id: Schema.String },
		Held: { reason: Schema.String },
		NoSlot: { limit: Schema.Number },
		NotOldest: { id: Schema.String },
	},
	run: Effect.fn("Agents.admit")(function* (input, rows, reject) {
		const found = yield* rows.birth.find(input.id);
		if (Option.isNone(found)) return yield* reject.Unknown({ id: input.id });
		const held = found.value;
		if (held.status !== "requested") return yield* reject.NotRequested({ id: input.id });
		const eligibility = new Map((yield* rows.pieceProgress.where({})).map((value) => [value.id, value.eligible]));
		const eligible = (value: typeof birth.Row.Type) =>
			value.source !== "dispatch" || value.pieceId === null || eligibility.get(value.pieceId) === true;
		if (!eligible(held)) return yield* reject.NotEligible({ id: held.id });
		const flags = yield* rows.flag.where({ scope: FLEET });
		if (!switchedOn(flags, held)) return yield* reject.Held({ reason: `${held.source} births are held` });
		const quiet = new Set((yield* rows.voyage.where({})).filter((sailing) => sailing.quietedAt !== null).map((sailing) => sailing.id));
		const quieted = (value: typeof birth.Row.Type) => SWITCHES[value.source] !== undefined && value.voyageId !== null && quiet.has(value.voyageId);
		if (quieted(held)) return yield* reject.Held({ reason: "the voyage is quiet" });
		const capacities = yield* rows.capacity.where({});
		if (capacities.some((value) => value.backend === input.backend && value.status === "blocked"))
			return yield* reject.Held({ reason: "provider capacity" });
		const admitted = { id: input.id, backend: input.backend, model: input.model, effort: input.effort };
		if (!held.createsAgent) return admitted;
		const births = yield* rows.birth.where({});
		const oldest = births
			.filter(
				(value) =>
					value.status === "requested" &&
					value.createsAgent &&
					eligible(value) &&
					!capacities.some((blocked) => blocked.backend === value.backend && blocked.status === "blocked") &&
					switchedOn(flags, value) &&
					!quieted(value),
			)
			.toSorted((a, b) => a.requestedAt.localeCompare(b.requestedAt) || a.id.localeCompare(b.id))[0];
		if (oldest !== undefined && oldest.id !== held.id) return yield* reject.NotOldest({ id: oldest.id });
		const chosen = yield* rows.count.find("maxParallelSessions");
		const limit = Option.isSome(chosen) ? chosen.value.count : COUNTS.maxParallelSessions.fallback;
		const sessions = yield* rows.session.where({ parentSessionId: null, status: "open" });
		const occupied = new Set(births.filter((value) => value.status === "admitted").map((value) => value.agentId));
		for (const current of yield* rows.agent.where({ status: "alive" })) {
			const root = sessions.find((value) => value.id === current.currentSessionId);
			if (root === undefined || root.executionStatus !== "idle") occupied.add(current.id);
		}
		if (occupied.size >= limit) return yield* reject.NoSlot({ limit });
		return admitted;
	}),
});
