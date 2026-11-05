import type { observed } from "@antumbra/domain-sessions/facts/observed.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { selection as sessionSelection } from "@antumbra/server-storage/records/session.ts";
import { Effect, Option } from "effect";
import { activity } from "#projections/sessions/observation-activity.ts";
import { attribute } from "#projections/sessions/observation-attribute.ts";
import { census } from "#projections/sessions/observation-census.ts";
import { settle } from "#projections/sessions/observation-settle.ts";
import { start } from "#projections/sessions/observation-start.ts";
import { tools } from "#projections/sessions/observation-tools.ts";
import { tree } from "#projections/sessions/observation-tree.ts";
import { Records } from "#records.ts";
export const observedMaterializer = Effect.fn("sessions.observed")(function* (
	fact: FactValue<typeof observed>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	yield* start(fact);
	if (fact.evidence.type === "started") return;
	const root = yield* rows.session
		.findOne({ where: { id: fact.sessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(root)) return;
	const nodes = yield* rows.session
		.findMany({ where: { rootSessionId: root.value.rootSessionId }, orderBy: { field: "storage_order", direction: "asc" }, select: sessionSelection })
		.pipe(Effect.orDie);
	const current = yield* attribute(fact, root.value, nodes);
	yield* tree(fact, current, nodes);
	yield* census(fact, root.value);
	yield* activity(fact, current, nodes);
	yield* tools(fact, current);
	yield* settle(fact, current);
});
