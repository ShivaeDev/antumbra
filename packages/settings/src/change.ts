import { SETTINGS, type SettingChange, SettingRefused, type SettingValue } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import { readSettings } from "#reading.ts";

const accept = (change: SettingChange) => {
	const declaration = SETTINGS[change.key];
	return Option.match(declaration.decode(change.value), {
		onNone: () => Effect.fail(new SettingRefused({ expects: declaration.expects, key: change.key })),
		onSome: (value: SettingValue) => Effect.succeed(value),
	});
};

export const changeSetting = (change: SettingChange) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const value = yield* accept(change);
		const now = yield* Clock.currentTimeMillis;
		if (value === SETTINGS[change.key].fallback) {
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
		return yield* readSettings;
	});
