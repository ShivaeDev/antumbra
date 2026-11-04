import { row } from "@antumbra/platform-feature/row.ts";
import { SettingCount, SettingFlag } from "@antumbra/platform-vocabulary/settings.ts";
import { Effect } from "effect";
import { rowsOf } from "#postgres/rows.ts";
export const rows = Effect.gen(function* () {
	return { flag: yield* rowsOf(flag, "flag"), count: yield* rowsOf(count, "count") };
});

export const flag = row("flag", SettingFlag.fields, { key: "key", scope: "scope" });

export const count = row("count", SettingCount.fields, { key: "key", scope: "scope" });
