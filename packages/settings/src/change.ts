import { SETTINGS, type SettingChange, SettingRefused } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import { readSettings } from "#reading.ts";

export const changeSetting = Effect.fn("settings.changeSetting")(function* (change: SettingChange) {
	const db = yield* Database;
	const declaration = SETTINGS[change.key];
	const value = yield* Option.match(declaration.decode(change.value), {
		onNone: () => Effect.fail(new SettingRefused({ expects: declaration.expects, key: change.key })),
		onSome: (value) => Effect.succeed(value),
	});
	const now = yield* Clock.currentTimeMillis;
	if (value === declaration.fallback) {
		yield* db.Setting.where({ key: change.key }).deleteAll();
	} else {
		const encoded = JSON.stringify(value);
		const updated = yield* db.Setting.where({ key: change.key }).update({
			updatedAt: new Date(now),
			value: encoded,
		});
		if (updated === null) {
			yield* db.Setting.create({ key: change.key, value: encoded });
		}
	}
	return yield* readSettings();
});
