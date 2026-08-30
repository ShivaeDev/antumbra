import { persistenceIt } from "@antumbra/persistence/testing";
import type { ChangeObservation } from "@antumbra/plugin-api";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { type ChangeRow, Changes } from "#index.ts";
import { CREW, changesLayer, createBerth, createPiece, createRepo, HEAD, makeScriptedHost, observation, REEF_SOURCE } from "#test/change-harness.ts";

const it = persistenceIt();

const seed = Effect.all([createRepo("repo-reef", "reef", REEF_SOURCE), createPiece("piece-reef"), createBerth(CREW)]);

const opened = Effect.flatMap(Changes, (changes) =>
	changes.open({
		agentId: CREW,
		base: "main",
		body: "soundings",
		draft: false,
		pieceId: "piece-reef",
		repoName: "reef",
		sessionId: "session-crew",
		title: "Chart the reef",
	}),
);

const observed = (row: ChangeRow, offset: number, patch: Partial<ChangeObservation>): ChangeObservation =>
	observation(
		row.externalId ?? "",
		{
			baseRef: row.baseRef,
			headRef: row.headRef,
			repoId: row.repoId,
			title: row.title,
		},
		{ activityAt: row.activityAt.getTime() + offset, ...patch },
	);

it.effectDB("attaches a manually landed observation to its prepared Change", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const prepared = yield* changes.submit({
			agentId: CREW,
			pieceId: "piece-reef",
			repoName: "reef",
			sessionId: "session-crew",
		});
		yield* scripted.announce(
			observation(
				"91",
				{
					baseRef: "main",
					headRef: HEAD,
					repoId: "repo-reef",
					title: "landed by hand",
				},
				{ stage: "landed" },
			),
		);
		const adopted = yield* changes.adopt({
			agentId: CREW,
			pieceId: "piece-reef",
			repoName: "reef",
			url: "https://scripted.test/changes/91",
		});
		expect(adopted).toMatchObject({
			id: prepared.id,
			stage: "landed",
			submissionKey: null,
		});
		expect(yield* db.Change.all()).toHaveLength(1);
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("attaches an exact later observation and ignores unknown identity", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const prepared = yield* changes.submit({
			agentId: CREW,
			pieceId: "piece-reef",
			repoName: "reef",
			sessionId: "session-crew",
		});
		const [attached] = yield* changes.observed("scripted", [
			observation("41", {
				baseRef: "main",
				headRef: HEAD,
				repoId: "repo-reef",
				title: "observed later",
			}),
		]);
		expect(attached).toMatchObject({ id: prepared.id, externalId: "41" });
		expect(
			yield* changes.observed("scripted", [
				observation("42", {
					baseRef: "main",
					headRef: "work/unknown",
					repoId: "repo-reef",
					title: "not submitted",
				}),
			]),
		).toEqual([]);
		expect(yield* db.Change.all()).toHaveLength(1);
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("preserves a prepared replacement when old host identity returns", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const first = yield* opened;
		yield* scripted.transition("repo-reef", "1", { stage: "withdrawn" });
		yield* changes.refresh("scripted");
		const replacement = yield* changes.submit({
			agentId: CREW,
			pieceId: "piece-reef",
			repoName: "reef",
			sessionId: "session-crew",
		});
		yield* scripted.transition("repo-reef", "1", { stage: "open" });
		expect(yield* changes.refresh("scripted")).toEqual([]);
		const rows = yield* db.Change.all();
		expect(rows).toHaveLength(2);
		expect(rows.find((row) => row.id === first.id)?.stage).toBe("withdrawn");
		expect(rows.find((row) => row.id === replacement.id)).toMatchObject({
			externalId: null,
			stage: "prepared",
			submissionKey: replacement.submissionKey,
		});
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("orders transitions and never reopens a terminal Change", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const row = yield* opened;
		const withdrawn = observed(row, 1, { stage: "withdrawn" });
		const reopened = observed(row, 2, { stage: "open" });
		yield* changes.observed("scripted", [withdrawn]);
		yield* changes.observed("scripted", [reopened]);
		yield* changes.observed("scripted", [reopened]);
		expect(Option.getOrThrow(yield* db.Change.where({ id: row.id }).first()).stage).toBe("withdrawn");
		expect((yield* db.ChangeTransition.where({ changeId: row.id }).all()).map((transition) => [transition.fromStage, transition.toStage])).toEqual([
			["prepared", "open"],
			["open", "withdrawn"],
		]);
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("keeps same-stage observations from mutating terminal Changes", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const first = yield* opened;
		const landed = Option.getOrThrow(Option.fromNullishOr((yield* changes.observed("scripted", [observed(first, 1, { stage: "landed" })]))[0]));
		const second = yield* opened;
		const withdrawn = Option.getOrThrow(
			Option.fromNullishOr((yield* changes.observed("scripted", [observed(second, 1, { stage: "withdrawn" })]))[0]),
		);
		const terminal = [
			{ row: landed, stage: "landed" },
			{ row: withdrawn, stage: "withdrawn" },
		] as const;
		const beforeRows = yield* Effect.forEach(terminal, ({ row }) => db.Change.where({ id: row.id }).first().pipe(Effect.map(Option.getOrThrow)));
		const beforeTransitions = yield* db.ChangeTransition.all();
		expect(
			yield* changes.observed(
				"scripted",
				terminal.map(({ row, stage }) =>
					observed(row, 10, {
						stage,
						title: `mutated ${stage}`,
					}),
				),
			),
		).toEqual(terminal.map(({ row }) => row));
		expect(yield* Effect.forEach(terminal, ({ row }) => db.Change.where({ id: row.id }).first().pipe(Effect.map(Option.getOrThrow)))).toEqual(
			beforeRows,
		);
		expect(yield* db.ChangeTransition.all()).toEqual(beforeTransitions);
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("settles existing host evidence after the owning Agent becomes terminal", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const row = yield* opened;
		yield* db.Agent.where({ id: CREW }).update({ status: "retired" });
		const [settled] = yield* changes.observed("scripted", [observed(row, 1, { stage: "landed" })]);
		expect(settled?.stage).toBe("landed");
		expect(Option.getOrThrow(yield* db.Change.where({ id: row.id }).first()).stage).toBe("landed");
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("keeps the freshest fact within and across observation calls", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const row = yield* opened;
		const newest = observed(row, 2, { stage: "landed" });
		const stale = observed(row, 1, { stage: "open", title: "stale" });
		yield* changes.observed("scripted", [newest, stale]);
		yield* Effect.all([changes.observed("scripted", [newest]), changes.observed("scripted", [stale])], { concurrency: "unbounded" });
		const stored = Option.getOrThrow(yield* db.Change.where({ id: row.id }).first());
		expect(stored).toMatchObject({ stage: "landed", title: row.title });
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});
