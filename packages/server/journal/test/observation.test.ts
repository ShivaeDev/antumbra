import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
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

const sounding = row("sounding", { id: Schema.String, depth: Schema.Number }, { key: "id" });
const Reading = Schema.Struct({ depth: Schema.Number, note: Schema.String });
const sounded = fact("Sounded", { id: Schema.String, reading: Schema.NullOr(Reading) }, { subject: "id" });
const sound = command("sound", {
	input: sounded.payload,
	reads: [],
	emits: sounded,
	rejections: {},
	run: ({ id, reading }) => Effect.succeed({ id, reading }),
});
const soundedMaterializer = materializer(sounded, {
	writes: [sounding],
	run: Effect.fn(function* (fact, rows) {
		const depth = fact.reading === null ? 0 : fact.reading.depth;
		const known = yield* rows.sounding.find(fact.id);
		yield* Option.isNone(known) ? rows.sounding.insert({ depth, id: fact.id }) : rows.sounding.update(fact.id, { depth });
	}),
});

const sightings = feature("sightings", {
	rows: [berth, sounding],
	facts: [sighted, sounded],
	commands: [sight, sound],
	queries: [],
	materializers: [sightedMaterializer, soundedMaterializer],
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

it.effect("a subject that returns to an earlier record is stored, and its projection follows", () =>
	Effect.gen(function* () {
		const { commit, database } = yield* setup;
		const shallow = { depth: 12, note: "sand" };
		const deep = { depth: 40, note: "mud" };
		yield* commit.commit(sound, { id: "harbour", reading: shallow, requestId: Request.make("one") });
		yield* commit.commit(sound, { id: "harbour", reading: deep, requestId: Request.make("two") });
		yield* commit.commit(sound, { id: "harbour", reading: shallow, requestId: Request.make("three") });
		expect(yield* Effect.orDie(database.read`SELECT "seq" FROM "journal" ORDER BY "seq"`)).toHaveLength(3);
		expect(yield* Effect.orDie(database.read`SELECT "depth" FROM "sounding"`)).toEqual([{ depth: 12 }]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("a subject repeating its own last record is still folded", () =>
	Effect.gen(function* () {
		const { commit, database } = yield* setup;
		const deep = { depth: 40, note: "mud" };
		const seq = yield* commit.commit(sound, { id: "harbour", reading: deep, requestId: Request.make("one") });
		expect(yield* commit.commit(sound, { id: "harbour", reading: deep, requestId: Request.make("two") })).toBe(seq);
		expect(yield* Effect.orDie(database.read`SELECT "seq" FROM "journal"`)).toEqual([{ seq }]);
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

it.effect("the runner's record folds a repeat and still acknowledges the log", () =>
	Effect.gen(function* () {
		const { commit, database } = yield* setup;
		yield* commit.observeBatch(record, [observation(sighted, { detail: "reachable", host: "github" })]);
		yield* commit.observeBatch({ ...record, cursor: 1, requestId: Request.make("runner:1") }, [
			observation(sighted, { detail: "reachable", host: "github" }),
		]);
		expect(yield* Effect.orDie(database.read`SELECT "seq" FROM "journal"`)).toHaveLength(1);
		expect(yield* commit.cursor("runner")).toBe(1);
	}).pipe(Effect.provide(Journal.memory())),
);
