import type * as Source from "@antumbra/domain-agents/commands/admit.ts";
import type { birth } from "@antumbra/domain-agents/rows/birth.ts";
import { COUNTS } from "@antumbra/domain-settings/queries/counts.ts";
import { allows, type Switched } from "@antumbra/domain-settings/queries/flags.ts";
import { quietIds } from "@antumbra/domain-voyages/rows/voyage.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { FLEET, type SwitchKey } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as agentSelection } from "@antumbra/server-storage/records/agent.ts";
import { selection as birthSelection } from "@antumbra/server-storage/records/birth.ts";
import { selection as capacitySelection } from "@antumbra/server-storage/records/capacity.ts";
import { selection as countSelection } from "@antumbra/server-storage/records/count.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { selection as pieceProgressSelection } from "@antumbra/server-storage/records/piece-progress.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { selection as voyageSelection } from "@antumbra/server-storage/records/voyage.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, Option } from "effect";

const SWITCHES: Partial<Record<typeof birth.Row.Type.source, SwitchKey>> = { dispatch: "spawnForPiece", hail: "spawnOnHail" };

const switchedOn = (flags: ReadonlyArray<Switched>, value: typeof birth.Row.Type): boolean => {
	const key = SWITCHES[value.source];
	return key === undefined || allows(flags, key);
};

export const admit = Effect.fn("Agents.admit")(function* (
	input: typeof Source.admit.Input.Type,
	reject: typeof Source.admit.reject,
): Effect.fn.Return<typeof Source.admit.emits.Payload.Type, RejectedBy<typeof Source.admit.rejections>, Records> {
	const rows = yield* Records;

	const found = yield* rows.birth
		.findOne({ where: { id: input.id }, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(found)) return yield* reject.Unknown({ id: input.id });
	const held = found.value;
	if (held.status !== "requested") return yield* reject.NotRequested({ id: input.id });
	const eligibility = new Map(
		(yield* rows.pieceProgress
			.findMany({ where: {}, orderBy: { field: "id", direction: "asc" }, select: pieceProgressSelection })
			.pipe(Effect.orDie)).map((value) => [value.id, value.eligible]),
	);
	const eligible = (value: typeof birth.Row.Type) => value.source !== "dispatch" || value.pieceId === null || eligibility.get(value.pieceId) === true;
	if (!eligible(held)) return yield* reject.NotEligible({ id: held.id });
	const flags = yield* rows.flag
		.findMany({ where: { scope: FLEET }, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection })
		.pipe(Effect.orDie);
	if (!switchedOn(flags, held)) return yield* reject.Held({ reason: `${held.source} births are held` });
	const quiet = quietIds(
		yield* rows.voyage.findMany({ where: {}, orderBy: { field: "opened_order", direction: "asc" }, select: voyageSelection }).pipe(Effect.orDie),
	);
	const quieted = (value: typeof birth.Row.Type) => SWITCHES[value.source] !== undefined && value.voyageId !== null && quiet.has(value.voyageId);
	if (quieted(held)) return yield* reject.Held({ reason: "the voyage is quiet" });
	const capacities = yield* rows.capacity
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: capacitySelection })
		.pipe(Effect.orDie);
	if (capacities.some((value) => value.backend === input.backend && value.status === "blocked"))
		return yield* reject.Held({ reason: "provider capacity" });
	const admitted = { id: input.id, backend: input.backend, model: input.model, effort: input.effort };
	if (!held.createsAgent) return admitted;
	const births = yield* rows.birth
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: birthSelection })
		.pipe(Effect.orDie);
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
	const chosen = yield* rows.count
		.findOne({ where: { key: "maxParallelSessions" }, orderBy: { field: "storage_order", direction: "asc" }, select: countSelection })
		.pipe(Effect.orDie);
	const limit = Option.isSome(chosen) ? chosen.value.count : COUNTS.maxParallelSessions.fallback;
	const sessions = yield* rows.session
		.findMany({ where: { parentSessionId: null, status: "open" }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	const occupied = new Set(births.filter((value) => value.status === "admitted").map((value) => value.agentId));
	for (const current of yield* rows.agent
		.findMany({ where: { status: "alive" }, orderBy: { field: "storage_order", direction: "asc" }, select: agentSelection })
		.pipe(Effect.orDie)) {
		const root = sessions.find((value) => value.id === current.currentSessionId);
		if (root === undefined || root.executionStatus !== "idle") occupied.add(current.id);
	}
	if (occupied.size >= limit) return yield* reject.NoSlot({ limit });
	return admitted;
});
