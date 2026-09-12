import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Layer } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import { LogDatabase, makeLog, RunnerLog } from "#log.ts";

export const file = (options: { readonly filename: string; readonly logId: string }) =>
	Layer.effect(RunnerLog)(
		Effect.gen(function* () {
			const sql = yield* SqliteClient.make({ filename: options.filename });
			return yield* makeLog(options.logId).pipe(Effect.provideService(LogDatabase, sql));
		}),
	).pipe(Layer.provide(reactivityLayer));
