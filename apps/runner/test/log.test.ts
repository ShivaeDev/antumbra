import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { RunnerLog } from "@antumbra/runner-fabric/log.ts";
import * as SqliteClient from "@effect/sql-sqlite-node/SqliteClient";
import { expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { layer as reactivityLayer } from "effect/unstable/reactivity/Reactivity";
import { file } from "#adapters/log.ts";

const directory = Effect.acquireRelease(
	Effect.promise(() => mkdtemp(join(tmpdir(), "antumbra-runner-log-"))),
	(path) => Effect.promise(() => rm(path, { recursive: true, force: true })),
);

const ASIDE = "runner.sqlite.";

it.live("sets a log of an earlier shape aside beside itself and starts a new one", () =>
	Effect.gen(function* () {
		const root = yield* directory;
		const filename = join(root, "runner.sqlite");
		yield* Effect.scoped(
			Effect.gen(function* () {
				const sql = yield* SqliteClient.make({ filename });
				yield* Effect.orDie(sql.unsafe(`CREATE TABLE runner_log (cursor INTEGER PRIMARY KEY, at REAL NOT NULL, event TEXT NOT NULL)`));
				const event = JSON.stringify({ type: "SessionSlept", requestId: "sleep", sessionId: "a" });
				yield* Effect.orDie(sql`INSERT INTO runner_log ${sql.insert({ cursor: 0, at: 100, event })}`);
			}),
		);
		const renewed = yield* Effect.scoped(
			Effect.gen(function* () {
				const log = yield* RunnerLog;
				expect(yield* log.read(-1)).toEqual([]);
				return log.logId;
			}).pipe(Effect.provide(file({ filename, seed: "shell" }))),
		);
		const aside = (yield* Effect.promise(() => readdir(root))).filter((name) => name.startsWith(ASIDE));
		expect(aside).toHaveLength(1);
		expect(renewed).toBe(`shell:${aside[0]?.slice(ASIDE.length)}`);
		const preserved = yield* Effect.scoped(
			Effect.gen(function* () {
				const sql = yield* SqliteClient.make({ filename: join(root, String(aside[0])), readonly: true, disableWAL: true });
				return yield* Effect.orDie(sql`SELECT cursor FROM runner_log`);
			}),
		);
		expect(preserved).toEqual([{ cursor: 0 }]);
	}).pipe(Effect.provide(reactivityLayer)),
);
