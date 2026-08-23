import {
	SETTING_KEYS,
	SETTINGS,
	type SettingDeclaration,
	type SettingKey,
	Settings,
	type SettingsReading,
	SettingValue,
} from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Effect, Option, Schema } from "effect";

const storedValue = Schema.decodeUnknownOption(
	Schema.fromJsonString(SettingValue),
);

const decodeSettings = Schema.decodeUnknownEffect(Settings);

// why: a row whose JSON no longer decodes was written against a declaration
// that has since moved on — a narrowed range, a kind that changed. The
// catalog's own value is the one that is always meaningful, so a shipped
// narrowing costs that override rather than the whole reading.
const override = (declaration: SettingDeclaration, raw: string | undefined) => {
	if (raw === undefined) {
		return Option.none();
	}
	const parsed = storedValue(raw);
	return Option.isSome(parsed) ? declaration.decode(parsed.value) : Option.none();
};

const chosen = (key: SettingKey, raw: string | undefined) => {
	const declaration = SETTINGS[key];
	const stored = override(declaration, raw);
	return Option.isSome(stored)
		? { key, overridden: true, value: stored.value }
		: { key, overridden: false, value: declaration.fallback };
};

// why: the assembled record crosses back through the catalog's own schemas
// rather than being asserted into shape. That is what a boundary read owes,
// and it also means a declaration whose default breaks its own rule fails
// here rather than reaching a caller that trusted the type.
export const readSettings = Effect.gen(function* () {
	const db = yield* Database;
	const rows = yield* db.Setting.all();
	const stored = new Map(rows.map((row) => [row.key, row.value]));
	const values = SETTING_KEYS.map((key) => chosen(key, stored.get(key)));
	const settings = yield* decodeSettings(
		Object.fromEntries(values.map((entry) => [entry.key, entry.value])),
	);
	return {
		overridden: values
			.filter((entry) => entry.overridden)
			.map((entry) => entry.key),
		settings,
	} satisfies SettingsReading;
});
