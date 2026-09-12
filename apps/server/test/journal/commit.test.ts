import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Database } from "@antumbra/server-journal/database.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { answered, it } from "#testing/entry.ts";

it.app("commits store provenance and update public readings", function* (app) {
	const database = yield* Database;
	const requestId = Id.Request.make("count-change");
	yield* app.clock.advance(1_700_000);
	const seq = yield* app.commit.settings.setCount({ key: "maxParallelSessions", count: 9, requestId });
	const facts = yield* Effect.orDie(database.write`SELECT * FROM "journal"`);
	expect(facts).toHaveLength(1);
	expect(facts[0]).toMatchObject({ at: 1_700_000, name: "CountSet", requestId, seq });
	expect(JSON.parse(String(facts[0]?.payload))).toEqual({ count: 9, key: "maxParallelSessions" });
	expect(yield* answered(app.api.settings.counts({}))).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 9 }));
});

it.app("rejected commands leave durable state unchanged", function* (app) {
	const database = yield* Database;
	yield* app.api.settings.setCount({ key: "maxParallelSessions", count: 9 });
	const facts = yield* Effect.orDie(database.write`SELECT * FROM "journal"`);
	const applied = yield* Effect.orDie(database.write`SELECT * FROM "applied"`);
	const rejection = yield* Effect.flip(app.commit.settings.setCount({ key: "maxParallelSessions", count: 100 }));
	expect(rejection).toMatchObject({ _tag: "OutOfRange", key: "maxParallelSessions" });
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toEqual(facts);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toEqual(applied);
	expect(yield* answered(app.api.settings.counts({}))).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 9 }));
});

it.app("commits reject repeated requests without writing again", function* (app) {
	const database = yield* Database;
	const requestId = Id.Request.make("count-change");
	const seq = yield* app.commit.settings.setCount({ key: "maxParallelSessions", count: 9, requestId });
	const refused = yield* Effect.flip(app.commit.settings.setCount({ key: "maxParallelSessions", count: 12, requestId }));
	expect(refused).toBeInstanceOf(AlreadyDone);
	expect(refused).toMatchObject({ requestId, seq });
	expect(yield* Effect.orDie(database.write`SELECT * FROM "journal"`)).toHaveLength(1);
	expect(yield* Effect.orDie(database.write`SELECT * FROM "applied"`)).toHaveLength(1);
	expect(yield* answered(app.api.settings.counts({}))).toContainEqual(expect.objectContaining({ key: "maxParallelSessions", count: 9 }));
});
