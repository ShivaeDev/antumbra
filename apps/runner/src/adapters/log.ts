import { LogDatabase, makeLog, RunnerLog } from "@antumbra/runner-fabric/log.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Effect, Layer } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";

export const file = (options: { readonly filename: string; readonly seed: string }) =>
	Layer.effect(RunnerLog)(
		Effect.gen(function* () {
			const sql = yield* SqliteClient.make({ filename: options.filename });
			yield* Effect.orDie(sql`PRAGMA synchronous = NORMAL`);
			const setAside = (epoch: number) =>
				Effect.gen(function* () {
					const target = `${options.filename}.${epoch}`;
					yield* sql`VACUUM INTO ${target}`;
					yield* Effect.logInfo("runner log set aside because its shape changed", { log: options.filename, setAside: target });
				}).pipe(Effect.orDie);
			return yield* makeLog(options.seed).pipe(Effect.provideService(LogDatabase, { sql, setAside }));
		}),
	).pipe(Layer.provide(reactivityLayer));
