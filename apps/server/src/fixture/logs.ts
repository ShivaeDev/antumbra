import { LogDatabase, makeLog } from "@antumbra/runner-fabric/log.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { Clock, Effect, FileSystem, Layer, Path, Schema } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import { TranscriptLog } from "#transcript/read-log.ts";

const manifest = Schema.Struct({ runnerLogs: Schema.Array(Schema.Struct({ path: Schema.String, seed: Schema.String })) });

export const capturedLogs = (directory: string) =>
	Layer.effect(
		TranscriptLog,
		Effect.gen(function* () {
			const fs = yield* FileSystem.FileSystem;
			const path = yield* Path.Path;
			const contents = yield* fs.readFileString(path.join(directory, "manifest.json"));
			const captured = yield* Schema.decodeUnknownEffect(Schema.fromJsonString(manifest))(contents);
			const logs = yield* Effect.forEach(captured.runnerLogs, (entry) =>
				Effect.gen(function* () {
					const filename = path.join(directory, entry.path);
					yield* fs.access(filename);
					const sql = yield* SqliteClient.make({ filename });
					const backup = Effect.gen(function* () {
						const epoch = yield* Clock.currentTimeMillis;
						yield* sql`VACUUM INTO ${`${filename}.upgrade-${epoch}`}`;
					}).pipe(Effect.orDie);
					return yield* makeLog(entry.seed).pipe(Effect.provideService(LogDatabase, { sql, backup }));
				}),
			);
			return {
				read: Effect.fn("CapturedLogs.read")(function* (logId: string, after: number) {
					const log = logs.find((held) => held.logId === logId);
					if (log === undefined) return { entries: [], unavailable: [`Captured runner log ${logId} is missing.`] };
					return { entries: yield* log.read(after), unavailable: [] };
				}),
			};
		}),
	).pipe(Layer.provide(reactivityLayer));
