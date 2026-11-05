import type { SettingsEvent } from "@antumbra/platform-vocabulary/settings-event.ts";
import { FLEET } from "@antumbra/platform-vocabulary/settings-ids.ts";
import type { Event } from "@shivaedev/events/types.ts";
import { invalidateOnCommit } from "@shivaedev/sql/transact.ts";
import { Effect } from "effect";
import { SqlClient } from "effect/sql";
import type { rows } from "#settings/rows.ts";

export const apply = (handles: Effect.Success<typeof rows>) =>
	Effect.fn("SettingsHistory.apply")(function* ({ value }: Event<typeof SettingsEvent.Type>) {
		if (value._tag === "CountSet") {
			const row = { key: value.key, count: value.count, scope: FLEET };
			if (
				yield* handles.count.count({ where: { key: value.key } }).pipe(
					Effect.map((count) => count > 0),
					Effect.orDie,
				)
			)
				yield* handles.count.updateVoid({ ...row, key: value.key }).pipe(Effect.orDie);
			else yield* handles.count.insertVoid(row).pipe(Effect.orDie);
		} else
			for (const key of value.keys) {
				const row = { key, on: value.on, scope: FLEET };
				if (
					yield* handles.flag.count({ where: { key: key } }).pipe(
						Effect.map((count) => count > 0),
						Effect.orDie,
					)
				)
					yield* handles.flag.updateVoid({ ...row, key: key }).pipe(Effect.orDie);
				else yield* handles.flag.insertVoid(row).pipe(Effect.orDie);
			}
	});
export const reset = Effect.gen(function* () {
	const sql = yield* SqlClient.SqlClient;
	yield* sql`delete from "flag"`;
	yield* sql`delete from "count"`;
	yield* invalidateOnCommit(["flag", "count"]);
});
