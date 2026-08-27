import {
	SETTINGS,
	type SettingChange,
	type SettingKey,
	SettingRefused,
	type SettingValue,
} from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Clock, Effect, Option } from "effect";
import { readSettings } from "#settings-reading.ts";

// why: a row means the admiral chose something other than what the catalog
// says. Writing the declared value back removes the row instead of restating
// it, so an installation that never chose otherwise follows the catalog when a
// later release picks a better default.
const store = (key: SettingKey, value: SettingValue, now: number) =>
	Effect.gen(function* () {
		const db = yield* Database;
		if (value === SETTINGS[key].fallback) {
			yield* db.Setting.where({ key }).deleteAll();
			return;
		}
		const encoded = JSON.stringify(value);
		const exists = yield* db.Setting.where({ key }).exists();
		if (exists) {
			yield* db.Setting.where({ key }).update({
				updatedAt: new Date(now),
				value: encoded,
			});
			return;
		}
		yield* db.Setting.create({ key, value: encoded }).pipe(
			Effect.catchTag("PrismaError", (failure) =>
				db.Setting.where({ key })
					.update({ updatedAt: new Date(now), value: encoded })
					.pipe(
						Effect.flatMap((updated) =>
							updated === null ? Effect.fail(failure) : Effect.void,
						),
					),
			),
		);
	});

const accept = (change: SettingChange) => {
	const declaration = SETTINGS[change.key];
	return Option.match(declaration.decode(change.value), {
		onNone: () =>
			Effect.fail(
				new SettingRefused({ expects: declaration.expects, key: change.key }),
			),
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
