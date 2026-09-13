import { LogDatabase, makeLog, RunnerLog } from "@antumbra/runner-fabric/log.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Clock, Effect, Layer } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";

export const file = (options: { readonly filename: string; readonly seed: string }) =>
	Layer.effect(RunnerLog)(
		Effect.gen(function* () {
			const sql = yield* SqliteClient.make({ filename: options.filename });
			yield* Effect.orDie(sql`PRAGMA synchronous = NORMAL`);
			const backup = Effect.gen(function* () {
				const epoch = yield* Clock.currentTimeMillis;
				yield* sql`VACUUM INTO ${`${options.filename}.upgrade-${epoch}`}`;
			}).pipe(Effect.orDie);
			return yield* makeLog(options.seed).pipe(Effect.provideService(LogDatabase, { sql, backup }));
		}),
	).pipe(Layer.provide(reactivityLayer));
