import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { it } from "@effect/vitest";
import { Effect, Option, Schema } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import { expect } from "vitest";
import { app, registryOf } from "#app.ts";
import { commitService } from "#commit.ts";
import { Database } from "#database.ts";
import * as Journal from "#journal.ts";
import { observation } from "#observe.ts";
import { start } from "#startup.ts";

const berth = row("berth", { host: Schema.String, detail: Schema.String }, { key: "host" });
const sighted = fact("Sighted", { host: Schema.String, detail: Schema.String }, { subject: "host" });
const sight = command("sight", {
	input: sighted.payload,
	reads: [],
	emits: sighted,
	rejections: {},
	run: ({ detail, host }) => Effect.succeed({ detail, host }),
});
const sightedMaterializer = materializer(sighted, {
	writes: [berth],
	run: Effect.fn(function* (fact, rows) {
		const known = yield* rows.berth.find(fact.host);
		yield* Option.isNone(known) ? rows.berth.insert({ detail: fact.detail, host: fact.host }) : rows.berth.update(fact.host, { detail: fact.detail });
	}),
});
const sightings = feature("sightings", {
	rows: [berth],
	facts: [sighted],
	commands: [sight],
	queries: [],
	materializers: [sightedMaterializer],
});
const definition = app([sightings]);

const setup = Effect.gen(function* () {
	const database = yield* Database;
	const registry = yield* registryOf(definition);
	const reactivity = yield* Reactivity;
	yield* start(database.write, registry);
	return { commit: commitService({ reactivity, registry, sql: database.write }), database };
});

const record = { at: 120, cursor: 0, logId: "runner", requestId: Request.make("runner:0") };

it.effect("an observation repeating its subject's last content is not stored again", () =>
	Effect.gen(function* () {
		const { commit, database } = yield* setup;
		const seq = yield* commit.commit(sight, { detail: "reachable", host: "github", requestId: Request.make("one") });
		expect(yield* commit.commit(sight, { detail: "reachable", host: "github", requestId: Request.make("two") })).toBe(seq);
		expect(yield* Effect.orDie(database.read`SELECT "seq" FROM "journal"`)).toEqual([{ seq }]);
		expect(yield* Effect.orDie(database.read`SELECT "seq" FROM "applied" ORDER BY "requestId"`)).toEqual([{ seq }, { seq }]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("an observation that changes its subject is stored and so is a later return to the old content", () =>
	Effect.gen(function* () {
		const { commit, database } = yield* setup;
		yield* commit.commit(sight, { detail: "reachable", host: "github", requestId: Request.make("one") });
		yield* commit.commit(sight, { detail: "signed out", host: "github", requestId: Request.make("two") });
		yield* commit.commit(sight, { detail: "reachable", host: "github", requestId: Request.make("three") });
		expect(yield* Effect.orDie(database.read`SELECT "payload" FROM "journal" ORDER BY "seq"`)).toHaveLength(3);
		expect(yield* Effect.orDie(database.read`SELECT "detail" FROM "berth"`)).toEqual([{ detail: "reachable" }]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("one subject's repeat does not silence another subject's first sighting", () =>
	Effect.gen(function* () {
		const { commit, database } = yield* setup;
		yield* commit.commit(sight, { detail: "reachable", host: "github", requestId: Request.make("one") });
		yield* commit.commit(sight, { detail: "reachable", host: "gitlab", requestId: Request.make("two") });
		yield* commit.commit(sight, { detail: "reachable", host: "github", requestId: Request.make("three") });
		expect(yield* Effect.orDie(database.read`SELECT "payload" FROM "journal" ORDER BY "seq"`)).toHaveLength(2);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("a command is refused an operation the runner's record already answered", () =>
	Effect.gen(function* () {
		const { commit, database } = yield* setup;
		const operation = Request.make("agent-one:provision");
		yield* commit.observeBatch(record, [observation(sighted, { detail: "reachable", host: "github" }, operation)]);
		const refused = yield* Effect.flip(commit.commit(sight, { detail: "signed out", host: "github", requestId: operation }));
		expect(refused).toBeInstanceOf(AlreadyDone);
		expect(yield* Effect.orDie(database.read`SELECT "requestId" FROM "journal"`)).toEqual([{ requestId: operation }]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("the runner's record skips an operation a command already answered", () =>
	Effect.gen(function* () {
		const { commit, database } = yield* setup;
		const operation = Request.make("agent-one:provision");
		yield* commit.commit(sight, { detail: "reachable", host: "github", requestId: operation });
		yield* commit.observeBatch(record, [observation(sighted, { detail: "signed out", host: "github" }, operation)]);
		expect(yield* Effect.orDie(database.read`SELECT "requestId" FROM "journal"`)).toEqual([{ requestId: operation }]);
		expect(yield* commit.cursor("runner")).toBe(0);
	}).pipe(Effect.provide(Journal.memory())),
);
