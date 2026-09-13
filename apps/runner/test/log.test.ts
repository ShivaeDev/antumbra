import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RunnerLog } from "@antumbra/runner-fabric/log.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { expect, it } from "@effect/vitest";
import { Effect, Hash } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import { file } from "#adapters/log.ts";

const directory = Effect.acquireRelease(
	Effect.promise(() => mkdtemp(join(tmpdir(), "antumbra-runner-log-"))),
	(path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
);

const ENTRIES = "CREATE TABLE IF NOT EXISTS runner_log (cursor INTEGER PRIMARY KEY, at REAL NOT NULL, event TEXT NOT NULL)";
const REQUESTS = "CREATE INDEX IF NOT EXISTS runner_request ON runner_log(json_extract(event, '$.requestId'))";
const event = { type: "SessionSlept", requestId: "sleep", sessionId: "a" } as const;

for (const recordedIdentity of [undefined, "shell:100"]) {
	it.live(`upgrades ${recordedIdentity === undefined ? "the original log" : "the hash-tracked log"} without changing its evidence or cursor`, () =>
		Effect.gen(function* () {
			const root = yield* directory;
			const filename = join(root, "runner.sqlite");
			const logId = recordedIdentity ?? "shell";
			yield* Effect.scoped(
				Effect.gen(function* () {
					const sql = yield* SqliteClient.make({ filename });
					yield* Effect.orDie(sql.unsafe(ENTRIES));
					if (recordedIdentity !== undefined) {
						yield* Effect.orDie(sql.unsafe(REQUESTS));
						yield* Effect.orDie(sql`CREATE TABLE log_shape (logId TEXT PRIMARY KEY, hash TEXT NOT NULL)`);
						const hash = Hash.string([ENTRIES, REQUESTS].join("; ")).toString(36);
						yield* Effect.orDie(sql`INSERT INTO log_shape ${sql.insert({ logId, hash })}`);
					}
					yield* Effect.orDie(sql`INSERT INTO runner_log ${sql.insert({ cursor: 7, at: 100, event: JSON.stringify(event) })}`);
				}),
			);
			yield* Effect.scoped(
				Effect.gen(function* () {
					const log = yield* RunnerLog;
					expect(log.logId).toBe(logId);
					expect(yield* log.read(6)).toEqual([{ logId, cursor: 7, at: 100, event }]);
					expect(yield* log.request("sleep")).toEqual([{ logId, cursor: 7, at: 100, event }]);
					expect((yield* log.append({ type: "SessionSlept", requestId: "next", sessionId: "b" })).cursor).toBe(8);
				}).pipe(Effect.provide(file({ filename, seed: "shell" }))),
			);
			yield* Effect.scoped(
				Effect.gen(function* () {
					const log = yield* RunnerLog;
					expect(log.logId).toBe(logId);
					expect((yield* log.read(-1)).map(({ cursor }) => cursor)).toEqual([7, 8]);
				}).pipe(Effect.provide(file({ filename, seed: "a-different-seed" }))),
			);
			expect(yield* Effect.promise(() => readdir(root))).toEqual(["runner.sqlite"]);
		}).pipe(Effect.provide(reactivityLayer)),
	);
}
