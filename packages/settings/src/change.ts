import { SETTINGS, type SettingChange, type SettingKey, SettingRefused, type SettingValue } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import { readSettings } from "#reading.ts";

const store = (key: SettingKey, value: SettingValue, now: number) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (value === SETTINGS[key].fallback) {
			yield* db.Setting.where({ key }).deleteAll();
			return;
		}
		const encoded = JSON.stringify(value);
		const updated = yield* db.Setting.where({ key }).update({
			updatedAt: new Date(now),
			value: encoded,
		});
		if (updated === null) {
			yield* db.Setting.create({ key, value: encoded });
		}
	});

const accept = (change: SettingChange) => {
	const declaration = SETTINGS[change.key];
	return Option.match(declaration.decode(change.value), {
		onNone: () => Effect.fail(new SettingRefused({ expects: declaration.expects, key: change.key })),
		onSome: (value: SettingValue) => Effect.succeed(value),
	});
};

export const changeSetting = (change: SettingChange) =>
	Effect.gen(function* () {
		const value = yield* accept(change);
		const now = yield* Clock.currentTimeMillis;
		yield* store(change.key, value, now);
		return yield* readSettings;
	});
