import { app, registryOf } from "@antumbra/server-journal/app.ts";
import { Database } from "@antumbra/server-journal/database.ts";
import * as Journal from "@antumbra/server-journal/journal.ts";
import { start } from "@antumbra/server-journal/startup.ts";
import { it } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vitest";
import { features } from "#features.ts";
import { projections } from "#projections.ts";

const JOURNAL = `CREATE TABLE "journal" ("seq" INTEGER PRIMARY KEY AUTOINCREMENT, "at" INTEGER NOT NULL, "requestId" TEXT NOT NULL, "name" TEXT NOT NULL, "payload" TEXT NOT NULL, "subject" TEXT)`;

const SESSION = "session:stop";
const STOPPED_AT = "2026-09-13T09:00:00.000Z";

const started = {
	sessionId: SESSION,
	live: true,
	nodeRef: null,
	origin: null,
	operationId: "start",
	evidence: {
		type: "started",
		agentId: "agent:stop",
		backend: "claude",
		cwd: "/berth",
		nativeRef: "native",
		runnerId: "runner",
		toolSetVersion: "1",
	},
};

const stopped = { id: "stop", sessionId: SESSION, reason: "admiral", stoppedAt: STOPPED_AT };

it.effect("a journal that recorded a stop comes back with the session still held", () =>
	Effect.gen(function* () {
		const { read, write } = yield* Database;
		yield* write.unsafe(JOURNAL);
		yield* write`INSERT INTO "journal" ${write.insert([
			{ seq: 1, at: 100, requestId: "start", name: "SessionObserved", payload: JSON.stringify(started), subject: SESSION },
			{ seq: 2, at: 200, requestId: "stop", name: "SessionStopped", payload: JSON.stringify(stopped), subject: null },
		])}`;
		yield* start(write, yield* registryOf(app(features, projections)));
		expect(yield* read`SELECT "id", "stoppedAt" FROM "session"`).toEqual([{ id: SESSION, stoppedAt: STOPPED_AT }]);
		expect(yield* read`SELECT "id", "kind", "status" FROM "sessionOperation"`).toEqual([{ id: "stop", kind: "interrupt", status: "requested" }]);
	}).pipe(Effect.provide(Journal.memory()), Effect.orDie),
);
