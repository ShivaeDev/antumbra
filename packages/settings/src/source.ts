import { SettingsSource } from "@antumbra/contract";
import { Database } from "@antumbra/persistence";
import { Context, Effect, Layer } from "effect";
import { changeSetting } from "#change.ts";
import { readSettings } from "#reading.ts";

export const SettingsSourceLive = Layer.effect(SettingsSource)(
	Effect.gen(function* () {
		const db = yield* Database;
		const context = Context.make(Database, db);
		return {
			change: (change) => Effect.provide(changeSetting(change), context),
			current: Effect.provide(readSettings, context),
		};
	}),
);
