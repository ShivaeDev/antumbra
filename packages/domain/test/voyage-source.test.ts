import { BoardScope, Boards, EntryInput } from "@antumbra/boards";
import { type SightFailure, VoyageSource, type VoyageView } from "@antumbra/contract";
import { Pieces } from "@antumbra/pieces";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Fiber, Option, Stream } from "effect";
import { eventually, openReefVoyage, retireOneAlive, sessionIdOf } from "#test/voyage-fixtures.ts";

const soundings = (voyageId: string) => ({
	charter: "sound the northern shoals",
	dependsOn: [],
	expectation: "the depths are recorded",
	role: "hand",
	title: "soundings",
	voyageId,
});

const summaryOf = (voyageId: string) =>
	Effect.gen(function* () {
		const source = yield* VoyageSource;
		for (const row of yield* source.voyages) {
			if (row.id === voyageId) {
				return row;
			}
		}
		return yield* Effect.die(new Error(`no summary for voyage ${voyageId}`));
	});

const chartered = (voyageId: string) => Effect.flatMap(Pieces, (pieces) => pieces.charter(soundings(voyageId)));

const written = (scope: BoardScope, body: string) =>
	Effect.flatMap(Boards, (boards) => boards.write(scope, EntryInput.Note({ authorAgentId: Option.none(), body, register: "smooth" })));

const launched = (pieceId: string) => Effect.flatMap(Pieces, (pieces) => pieces.launch(pieceId));

const anyReady = (view: VoyageView) => view.pieces.some((piece) => piece.state === "ready");

const captainRetired = (view: VoyageView) => view.captain?.status === "retired";

// Subscribe through the opening snapshot before the tested write so only a reaction to that write can satisfy the watcher.
const watchUntil = (feed: Stream.Stream<VoyageView, SightFailure>, matches: (view: VoyageView) => boolean) =>
	Effect.gen(function* () {
		const opened = yield* Deferred.make<void>();
		const watcher = yield* feed.pipe(
			Stream.tap(() => Deferred.succeed(opened, undefined)),
			Stream.filter(matches),
			Stream.take(1),
			Stream.runCollect,
			Effect.forkChild,
		);
		yield* Deferred.await(opened);
		return watcher;
	});

it.effectApp("the list and the read carry the state the domain derived", function* () {
	const source = yield* VoyageSource;
	const opened = yield* openReefVoyage;
	const quiet = yield* summaryOf(opened.id);
	expect(quiet.state).toBe("quiet");
	expect(quiet.captain).toBeNull();
	const piece = yield* chartered(opened.id);
	yield* launched(piece.id);
	expect((yield* summaryOf(opened.id)).counts).toEqual({ active: 0, done: 0, pieces: 1, ready: 1 });
	const view = yield* source.voyage(opened.id);
	expect(view.context).toBe(opened.context);
	expect(view.pieces.map((row) => row.state)).toEqual(["ready"]);
	expect(view.pieces[0]?.launchedAt).toEqual(expect.any(String));
});

it.effectApp("a board entry the window writes carries no author agent", function* () {
	const source = yield* VoyageSource;
	const opened = yield* openReefVoyage;
	yield* written(BoardScope.Voyage({ voyageId: opened.id }), "the reef shifts after a storm");
	const view = yield* source.voyage(opened.id);
	expect(view.board).toEqual([
		{
			authorAgentId: null,
			body: "the reef shifts after a storm",
			createdAt: expect.any(String),
			id: expect.any(String),
			kind: "note",
			register: "smooth",
			seq: 1,
		},
	]);
});

it.effectApp("a voyage read carries each piece's own log", function* () {
	const source = yield* VoyageSource;
	const opened = yield* openReefVoyage;
	const piece = yield* chartered(opened.id);
	yield* written(BoardScope.Piece({ pieceId: piece.id }), "## Sounding\n\nThe edge is **shallow**.");

	const view = yield* source.voyage(opened.id);
	expect(view.pieces[0]?.board).toMatchObject([
		{
			body: "## Sounding\n\nThe edge is **shallow**.",
			register: "smooth",
		},
	]);
});

it.effectApp("a hail puts a captain and a crew row on what the window reads", { clock: "live" }, function* () {
	const source = yield* VoyageSource;
	const opened = yield* openReefVoyage;
	const hailed = yield* source.hail(opened.id);
	yield* eventually(
		Effect.gen(function* () {
			const view = yield* source.voyage(opened.id);
			expect(view.captain).toEqual({
				agentId: hailed.agentId,
				atWork: true,
				sessionId: yield* sessionIdOf(hailed.agentId),
				status: "alive",
			});
			expect(view.crew).toEqual([{ agentId: hailed.agentId, role: "captain", status: "alive" }]);
			expect(view.state).toBe("underWay");
		}),
	);
});

it.effectApp("the feed shows the piece as ready once it is launched", function* () {
	const source = yield* VoyageSource;
	const opened = yield* openReefVoyage;
	const piece = yield* chartered(opened.id);
	const watcher = yield* watchUntil(source.voyageFeed(opened.id), anyReady);
	yield* launched(piece.id);
	const seen = yield* Fiber.join(watcher);
	expect(seen[0]?.pieces.map((row) => row.id)).toEqual([piece.id]);
});

// Retirement changes Agent status without writing Voyage; this proves the Voyage feed also reacts to fleet refreshes.
it.effectApp("the feed follows an agent's status with no voyage row touched", { clock: "live" }, function* ({ scripted }) {
	const source = yield* VoyageSource;
	const opened = yield* openReefVoyage;
	const hailed = yield* source.hail(opened.id);
	yield* eventually(
		Effect.gen(function* () {
			const view = yield* source.voyage(opened.id);
			expect(view.captain?.status).toBe("alive");
		}),
	);
	const watcher = yield* watchUntil(source.voyageFeed(opened.id), captainRetired);
	yield* retireOneAlive(scripted);
	const seen = yield* Fiber.join(watcher);
	expect(seen[0]?.captain?.agentId).toBe(hailed.agentId);
	expect(seen[0]?.state).toBe("quiet");
});

it.effectApp("a voyage nobody opened is a failure, never an empty view", function* () {
	const source = yield* VoyageSource;
	const outcome = yield* source.voyage("ghost").pipe(Effect.flip);
	expect(outcome._tag).toBe("SightFailure");
	expect(outcome.message).toContain("no such voyage: ghost");
});
