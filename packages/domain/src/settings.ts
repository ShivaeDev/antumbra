import { SettingsSource } from "@antumbra/contract";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Context, Effect, Layer } from "effect";
import { changeSetting } from "#settings-change.ts";
import { readSettings } from "#settings-reading.ts";

// why: settings are read on every pass of the loops that consult them, so the
// source reads through to the rows each time rather than holding a copy.
// There is nothing here to keep in step with a write, and a change is live on
// the next pass without anyone ringing a bell.
export const SettingsSourceLive = Layer.effect(SettingsSource)(
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const executors = yield* Effect.context<WriteExecutors>();
		const context = Context.merge(
			executors,
			Context.make(Database, db).pipe(Context.add(Writer, writer)),
		);
		return {
			change: (change) => Effect.provide(changeSetting(change), context),
			current: Effect.provide(readSettings, context),
		};
	}),
);
