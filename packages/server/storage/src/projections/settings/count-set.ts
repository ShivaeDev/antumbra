import type { countSet } from "@antumbra/domain-settings/facts/count-set.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as countSelection } from "@antumbra/server-storage/records/count.ts";
import { Effect, Option } from "effect";
import { Records } from "#records.ts";

export const countSetMaterializer = Effect.fn("settings.CountSet")(function* (
	fact: FactValue<typeof countSet>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	const set = { count: fact.count, key: fact.key, scope: FLEET };
	const stored = yield* rows.count
		.findOne({ where: { key: fact.key }, orderBy: { field: "storage_order", direction: "asc" }, select: countSelection })
		.pipe(Effect.orDie);
	if (Option.isNone(stored)) {
		return yield* rows.count.insertVoid(set).pipe(Effect.orDie);
	}
	yield* rows.count.updateVoid({ ...set, key: fact.key }).pipe(Effect.orDie);
});
