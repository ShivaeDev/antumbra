import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { projection } from "@antumbra/platform-feature/projection.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { it } from "@effect/vitest";
import { Effect, Exit, Fiber, Latch, Schema } from "effect";
import { Reactivity } from "effect/unstable/reactivity/Reactivity";
import { expect } from "vitest";
import { app, registryOf } from "#app.ts";
import { commitService } from "#commit.ts";
import { Database } from "#database.ts";
import * as Journal from "#journal.ts";
import { observation } from "#observe.ts";
import { start } from "#startup.ts";

const source = row("source", { id: Schema.String, value: Schema.Number, at: Schema.Number, seq: Schema.Number }, { key: "id" });
const total = row("total", { id: Schema.String, value: Schema.Number }, { key: "id" });
const doubled = row("doubled", { id: Schema.String, value: Schema.Number }, { key: "id" });
const added = fact("Added", { id: Schema.String, value: Schema.Number });
const add = command("add", {
	input: added.payload,
	reads: [],
	emits: added,
	rejections: {},
	run: ({ id, value }) => Effect.succeed({ id, value }),
});
const sourceWriter = materializer(added, {
	writes: [source],
	run: (fact, rows) => rows.source.insert({ id: fact.id, value: fact.value, at: fact.at, seq: fact.seq }),
});
const sample = feature("sample", { rows: [source, total, doubled], facts: [added], commands: [add], queries: [], materializers: [sourceWriter] });
const sum = projection("sum", {
	reads: [source],
	writes: [total],
	run: Effect.fn(function* (reads, writes) {
		const rows = yield* reads.source.where({});
		const value = rows.reduce((total, row) => total + row.value, 0);
		if (yield* writes.total.exists("sum")) yield* writes.total.update("sum", { value });
		else yield* writes.total.insert({ id: "sum", value });
	}),
});
const double = projection("double", {
	reads: [total],
	writes: [doubled],
	run: Effect.fn(function* (reads, writes) {
		const total = yield* reads.total.get("sum");
		if (yield* writes.doubled.exists("sum")) yield* writes.doubled.update("sum", { value: total.value * 2 });
		else yield* writes.doubled.insert({ id: "sum", value: total.value * 2 });
	}),
});
const definition = app([sample], [sum, double]);
const setup = Effect.gen(function* () {
	const database = yield* Database;
	const registry = yield* registryOf(definition);
	const reactivity = yield* Reactivity;
	yield* start(database.write, registry);
	return { database, registry, reactivity, commit: commitService({ backup: database.backup, sql: database.write, registry, reactivity }) };
});

it.effect("source materialization precedes the ordered derived stages", () =>
	Effect.gen(function* () {
		const { database, commit } = yield* setup;
		yield* commit.commit(add, { id: "one", value: 3, requestId: Request.make("one") });
		yield* commit.commit(add, { id: "two", value: 4, requestId: Request.make("two") });
		expect(yield* Effect.orDie(database.read`SELECT "value" FROM "doubled"`)).toEqual([{ value: 14 }]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("a failing derived stage rolls back the source fact and every row", () =>
	Effect.gen(function* () {
		const { database, registry, reactivity } = yield* setup;
		const failing = { ...registry, projections: [...registry.projections, { reads: [], writes: [], run: () => Effect.die("projection failed") }] };
		const commit = commitService({ backup: database.backup, sql: database.write, registry: failing, reactivity });
		expect(Exit.isFailure(yield* Effect.exit(commit.commit(add, { id: "one", value: 3, requestId: Request.make("one") })))).toBe(true);
		expect(yield* Effect.orDie(database.read`SELECT * FROM "source"`)).toEqual([]);
		expect(yield* Effect.orDie(database.read`SELECT * FROM "total"`)).toEqual([]);
		expect(yield* Effect.orDie(database.read`SELECT * FROM "journal"`)).toEqual([]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("runner cursors acknowledge each record once and keep operation identity", () =>
	Effect.gen(function* () {
		const { database, commit } = yield* setup;
		expect(yield* commit.cursor("runner")).toBe(-1);
		const observation = { logId: "runner", cursor: 0, at: 120, requestId: Request.make("operation"), payload: { id: "one", value: 3 } };
		const seq = yield* commit.observe(added, observation);
		expect(yield* commit.observe(added, observation)).toBe(seq);
		yield* commit.observe(added, { ...observation, cursor: 1, at: 130, payload: { id: "two", value: 4 } });
		expect(yield* commit.cursor("runner")).toBe(1);
		expect(yield* Effect.orDie(database.read`SELECT "at", "requestId" FROM "journal" ORDER BY "seq"`)).toEqual([
			{ at: 120, requestId: "operation" },
			{ at: 130, requestId: "operation" },
		]);
		expect(yield* Effect.orDie(database.read`SELECT "value" FROM "doubled"`)).toEqual([{ value: 14 }]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("a renewed runner log carries its own cursor instead of the retired log's", () =>
	Effect.gen(function* () {
		const { database, commit } = yield* setup;
		const retired = { logId: "runner:1", at: 120, requestId: Request.make("operation") };
		yield* commit.observe(added, { ...retired, cursor: 0, payload: { id: "one", value: 3 } });
		yield* commit.observe(added, { ...retired, cursor: 1, payload: { id: "two", value: 4 } });
		expect(yield* commit.cursor("runner:2")).toBe(-1);
		yield* commit.observe(added, { logId: "runner:2", cursor: 0, at: 130, requestId: Request.make("renewed"), payload: { id: "three", value: 5 } });
		expect(yield* commit.cursor("runner:1")).toBe(1);
		expect(yield* commit.cursor("runner:2")).toBe(0);
		expect(yield* Effect.orDie(database.read`SELECT "value" FROM "doubled"`)).toEqual([{ value: 24 }]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("shape changes replay all projections with original fact provenance", () =>
	Effect.gen(function* () {
		const { database, commit } = yield* setup;
		yield* commit.observe(added, { logId: "runner", cursor: 0, at: 120, requestId: Request.make("operation"), payload: { id: "one", value: 3 } });
		const before = yield* Effect.orDie(database.read`SELECT * FROM "source"`);
		const extra = row("extra", { id: Schema.String }, { key: "id" });
		const expanded = feature("expanded", { rows: [extra], facts: [], commands: [], queries: [], materializers: [] });
		const registry = yield* registryOf(app([sample, expanded], [sum, double]));
		yield* start(database.write, registry);
		expect(yield* Effect.orDie(database.read`SELECT * FROM "source"`)).toEqual(before);
		expect(yield* Effect.orDie(database.read`SELECT "value" FROM "doubled"`)).toEqual([{ value: 6 }]);
		expect(yield* commit.cursor("runner")).toBe(0);
		expect(yield* Effect.orDie(database.read`SELECT * FROM "journal"`)).toHaveLength(1);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("one runner record atomically contributes several facts or only advances its cursor", () =>
	Effect.gen(function* () {
		const { database, commit } = yield* setup;
		const metadata = { logId: "runner", cursor: 0, at: 120, requestId: Request.make("operation") };
		expect(yield* commit.observeBatch(metadata, [])).toBe(0);
		expect(yield* commit.cursor("runner")).toBe(0);
		const entries = [observation(added, { id: "one", value: 3 }), observation(added, { id: "two", value: 4 })];
		const seq = yield* commit.observeBatch({ ...metadata, cursor: 1 }, entries);
		expect(yield* commit.observeBatch({ ...metadata, cursor: 1 }, entries)).toBe(seq);
		expect(yield* commit.cursor("runner")).toBe(1);
		expect(yield* Effect.orDie(database.read`SELECT * FROM "journal"`)).toHaveLength(2);
		expect(yield* Effect.orDie(database.read`SELECT "value" FROM "doubled"`)).toEqual([{ value: 14 }]);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("debug replay applies revised derivation and preserves facts, provenance and runner cursors", () =>
	Effect.gen(function* () {
		const { database, commit, reactivity } = yield* setup;
		yield* commit.commit(add, { id: "one", value: 3, requestId: Request.make("one") });
		yield* commit.observe(added, { logId: "runner", cursor: 7, at: 120, requestId: Request.make("observed"), payload: { id: "two", value: 4 } });
		const facts = yield* Effect.orDie(database.read`SELECT * FROM "journal" ORDER BY "seq"`);
		const rows = yield* Effect.orDie(database.read`SELECT * FROM "source" ORDER BY "id"`);
		const triple = projection("triple", {
			reads: [total],
			writes: [doubled],
			run: Effect.fn(function* (reads, writes) {
				const total = yield* reads.total.get("sum");
				if (yield* writes.doubled.exists("sum")) yield* writes.doubled.update("sum", { value: total.value * 3 });
				else yield* writes.doubled.insert({ id: "sum", value: total.value * 3 });
			}),
		});
		yield* commitService({ backup: database.backup, sql: database.write, reactivity, registry: yield* registryOf(app([sample], [sum, triple])) })
			.rebuild;
		expect(yield* Effect.orDie(database.read`SELECT * FROM "source" ORDER BY "id"`)).toEqual(rows);
		expect(yield* Effect.orDie(database.read`SELECT * FROM "journal" ORDER BY "seq"`)).toEqual(facts);
		expect(yield* Effect.orDie(database.read`SELECT "value" FROM "doubled"`)).toEqual([{ value: 21 }]);
		expect(yield* commit.cursor("runner")).toBe(7);
		const repeated = yield* commit
			.commit(add, { id: "one", value: 3, requestId: Request.make("one") })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
		expect(repeated).toBe(facts[0]?.seq);
	}).pipe(Effect.provide(Journal.memory())),
);

it.effect("commands wait for replay before reading derived rows", () =>
	Effect.gen(function* () {
		const { database, commit, reactivity } = yield* setup;
		yield* commit.commit(add, { id: "one", value: 3, requestId: Request.make("one") });
		const replaying = yield* Latch.make(false);
		const release = yield* Latch.make(false);
		const held: typeof double = {
			...double,
			run: (reads, writes) =>
				Effect.gen(function* () {
					yield* replaying.open;
					yield* release.await;
					yield* double.run(reads, writes);
				}),
		};
		const current = commitService({
			backup: database.backup,
			sql: database.write,
			reactivity,
			registry: yield* registryOf(app([sample], [sum, held])),
		});
		const copy = command("copy", {
			input: { id: Schema.String },
			reads: [doubled],
			emits: added,
			rejections: {},
			run: ({ id }, rows) => Effect.map(rows.doubled.get("sum"), ({ value }) => ({ id, value })),
		});
		const rebuilding = yield* Effect.forkScoped(current.rebuild, { startImmediately: true });
		yield* replaying.await;
		const copying = yield* Effect.forkScoped(current.commit(copy, { id: "two", requestId: Request.make("two") }), { startImmediately: true });
		yield* release.open;
		yield* Fiber.join(rebuilding);
		yield* Fiber.join(copying);
		expect(yield* Effect.orDie(database.read`SELECT "value" FROM "source" WHERE "id" = 'two'`)).toEqual([{ value: 6 }]);
		expect(yield* Effect.orDie(database.read`SELECT "value" FROM "doubled"`)).toEqual([{ value: 18 }]);
	}).pipe(Effect.provide(Journal.memory())),
);
