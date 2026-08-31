import { persistenceIt } from "@antumbra/persistence/testing";
import { ChangeHostUnavailable, type OpenChangeRequest } from "@antumbra/plugin-api";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { Changes, type OpenChangeInput } from "#index.ts";
import { CREW, changesLayer, createBerth, createPiece, createRepo, HEAD, makeScriptedHost, observation, REEF_SOURCE } from "#test/change-harness.ts";

const it = persistenceIt();

const seed = Effect.all([createRepo("repo-reef", "reef", REEF_SOURCE), createPiece("piece-reef"), createBerth(CREW)]);

const proposal = (pieceId = "piece-reef"): OpenChangeInput => ({
	agentId: CREW,
	base: "main",
	body: "soundings",
	draft: false,
	pieceId,
	repoName: "reef",
	sessionId: "session-crew",
	title: "Chart the reef",
});

it.effectDB("keeps host identity scoped to its repository", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* Effect.all([
		createRepo("repo-reef", "reef", REEF_SOURCE),
		createRepo("repo-shoals", "shoals", "/somewhere/shoals"),
		createPiece("piece-reef"),
		createPiece("piece-shoals"),
	]);
	yield* scripted.announce(
		observation("77", {
			baseRef: "main",
			headRef: "work/reef",
			repoId: "repo-reef",
			title: "reef",
		}),
	);
	yield* scripted.announce(
		observation("77", {
			baseRef: "main",
			headRef: "work/shoals",
			repoId: "repo-shoals",
			title: "shoals",
		}),
	);
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const reef = yield* changes.adopt({
			agentId: null,
			pieceId: "piece-reef",
			repoName: "reef",
			url: "https://scripted.test/changes/77",
		});
		const shoals = yield* changes.adopt({
			agentId: null,
			pieceId: "piece-shoals",
			repoName: "shoals",
			url: "https://scripted.test/changes/77",
		});
		expect(shoals.id).not.toBe(reef.id);
		expect(yield* db.Change.all()).toHaveLength(2);
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("retries the frozen proposal after a lost host response", function* () {
	const scripted = yield* makeScriptedHost;
	let loseResponse = true;
	const host = {
		...scripted.host,
		open: (request: OpenChangeRequest) =>
			scripted.host.open(request).pipe(
				Effect.flatMap((seen) => {
					if (!loseResponse) return Effect.succeed(seen);
					loseResponse = false;
					return new ChangeHostUnavailable({
						detail: "response lost after acceptance",
						host: "scripted",
					});
				}),
			),
	};
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		yield* Effect.flip(changes.open(proposal()));
	}).pipe(Effect.provide(changesLayer([host])));
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		yield* changes.open({
			...proposal(),
			base: "other",
			body: "changed",
			draft: true,
			title: "changed",
		});
		const attempts = yield* scripted.attempted;
		expect(attempts).toHaveLength(2);
		expect(attempts[1]).toMatchObject({
			base: "main",
			body: "soundings",
			draft: false,
			title: "Chart the reef",
		});
		expect(yield* scripted.opened).toHaveLength(1);
	}).pipe(Effect.provide(changesLayer([host])));
});

it.effectDB("reuses one active submission claim across Pieces", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* createPiece("piece-west");
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const first = yield* changes.submit({
			agentId: CREW,
			pieceId: "piece-reef",
			repoName: "reef",
			sessionId: "session-crew",
		});
		const linked = yield* changes.submit({
			agentId: CREW,
			pieceId: "piece-west",
			repoName: "reef",
			sessionId: "session-crew",
		});
		expect(linked.id).toBe(first.id);
		expect(yield* db.Change.all()).toHaveLength(1);
		expect(yield* db.PieceChange.all()).toEqual(
			expect.arrayContaining([
				{ changeId: first.id, pieceId: "piece-reef", purpose: "produces" },
				{ changeId: first.id, pieceId: "piece-west", purpose: "produces" },
			]),
		);
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("does not transfer a foreign prepared claim during adoption", function* (db) {
	const scripted = yield* makeScriptedHost;
	yield* seed;
	yield* Effect.all([createPiece("piece-other"), createBerth("agent-other", REEF_SOURCE, HEAD)]);
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const own = yield* changes.submit({
			agentId: CREW,
			pieceId: "piece-reef",
			repoName: "reef",
			sessionId: "session-crew",
		});
		const foreign = yield* changes.submit({
			agentId: "agent-other",
			pieceId: "piece-other",
			repoName: "reef",
			sessionId: "session-other",
		});
		yield* scripted.announce(
			observation("88", {
				baseRef: "main",
				headRef: HEAD,
				repoId: "repo-reef",
				title: "opened outside Antumbra",
			}),
		);
		const adopted = yield* changes.adopt({
			agentId: CREW,
			pieceId: "piece-reef",
			repoName: "reef",
			url: "https://scripted.test/changes/88",
		});
		expect(adopted.id).toBe(own.id);
		expect(Option.getOrThrow(yield* db.Change.where({ id: foreign.id }).first())).toEqual(
			expect.objectContaining({ externalId: null, stage: "prepared" }),
		);
	}).pipe(Effect.provide(changesLayer([scripted.host])));
});

it.effectDB("settles an already-landed host response exactly once", function* (db) {
	const scripted = yield* makeScriptedHost;
	const host = {
		...scripted.host,
		open: (request: OpenChangeRequest) => scripted.host.open(request).pipe(Effect.map((seen) => ({ ...seen, stage: "landed" as const }))),
	};
	yield* seed;
	yield* Effect.gen(function* () {
		const changes = yield* Changes;
		const prepared = yield* changes.submit({
			agentId: CREW,
			pieceId: "piece-reef",
			repoName: "reef",
			sessionId: "session-crew",
		});
		const landed = yield* changes.open(proposal());
		expect(landed).toMatchObject({
			id: prepared.id,
			stage: "landed",
			submissionKey: null,
		});
		expect(yield* db.ChangeTransition.where({ changeId: landed.id }).all()).toEqual([
			expect.objectContaining({ fromStage: "prepared", toStage: "landed" }),
		]);
	}).pipe(Effect.provide(changesLayer([host])));
});
