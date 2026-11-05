import type { flagSet } from "@antumbra/domain-settings/facts/flag-set.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import { selection as flagSelection } from "@antumbra/server-storage/records/flag.ts";
import { Effect, Option } from "effect";
import { Records } from "#records.ts";

export const flagSetMaterializer = Effect.fn("settings.FlagSet")(function* (fact: FactValue<typeof flagSet>): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	for (const key of fact.keys) {
		const set = { key, on: fact.on, scope: FLEET };
		const stored = yield* rows.flag
			.findOne({ where: { key: key }, orderBy: { field: "storage_order", direction: "asc" }, select: flagSelection })
			.pipe(Effect.orDie);
		if (Option.isNone(stored)) yield* rows.flag.insertVoid(set).pipe(Effect.orDie);
		else yield* rows.flag.updateVoid({ ...set, key: key }).pipe(Effect.orDie);
	}
});
