import type { SettingsEvent } from "@antumbra/platform-vocabulary/settings-event.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#postgres/settings/rows.ts";

export const apply = (handles: Effect.Success<typeof rows>) =>
	Effect.fn("SettingsHistory.apply")(function* ({ value }: Event<typeof SettingsEvent.Type>) {
		if (value._tag === "CountSet") {
			const row = { key: value.key, count: value.count, scope: FLEET };
			if (yield* handles.count.exists(value.key)) yield* handles.count.update(value.key, row);
			else yield* handles.count.insert(row);
		} else
			for (const key of value.keys) {
				const row = { key, on: value.on, scope: FLEET };
				if (yield* handles.flag.exists(key)) yield* handles.flag.update(key, row);
				else yield* handles.flag.insert(row);
			}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from antumbra.flag`;
	yield* sql`delete from antumbra.count`;
	yield* invalidateOnCommit(["flag", "count"]);
});
