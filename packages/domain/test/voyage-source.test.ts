import { type SightFailure, VoyageSource, type VoyageView } from "@antumbra/contract";
import { it } from "@antumbra/testing";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Fiber, Stream } from "effect";
import { eventually, retireOneAlive, sessionIdOf } from "#test/voyage-fixtures.ts";

const reef = {
	backend: "scripted",
	context: "the reef is uncharted",
	name: "Chart the reef",
	northStar: "every shoal is known",
};

const soundings = (voyageId: string) => ({
	charter: "sound the northern shoals",
	dependsOn: [],
	expectation: "the depths are recorded",
	role: "hand",
	title: "soundings",
	voyageId,
});

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
	const opened = yield* source.open(reef);
	expect(opened.state).toBe("quiet");
	expect(opened.captain).toBeNull();
	const piece = yield* source.charterPiece(soundings(opened.id));
	yield* source.launch(piece.pieceId);
	const listed = yield* source.voyages;
	expect(listed.find((row) => row.id === opened.id)?.counts).toEqual({ active: 0, done: 0, pieces: 1, ready: 1 });
	const view = yield* source.voyage(opened.id);
	expect(view.context).toBe(reef.context);
	expect(view.pieces.map((row) => row.state)).toEqual(["ready"]);
	expect(view.pieces[0]?.launchedAt).toEqual(expect.any(String));
});

it.effectApp("a board entry the window writes carries no author agent", function* () {
	const source = yield* VoyageSource;
	const opened = yield* source.open(reef);
	yield* source.writeBoard({
		body: "the reef shifts after a storm",
		register: "smooth",
		scope: { kind: "voyage", voyageId: opened.id },
	});
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
	const opened = yield* source.open(reef);
	const piece = yield* source.charterPiece(soundings(opened.id));
	yield* source.writeBoard({
		body: "## Sounding\n\nThe edge is **shallow**.",
		register: "smooth",
		scope: { kind: "piece", pieceId: piece.pieceId },
	});

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
	const opened = yield* source.open(reef);
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
	const opened = yield* source.open(reef);
	const piece = yield* source.charterPiece(soundings(opened.id));
	const watcher = yield* watchUntil(source.voyageFeed(opened.id), anyReady);
	yield* source.launch(piece.pieceId);
	const seen = yield* Fiber.join(watcher);
	expect(seen[0]?.pieces.map((row) => row.id)).toEqual([piece.pieceId]);
});

// Retirement changes Agent status without writing Voyage; this proves the Voyage feed also reacts to fleet refreshes.
it.effectApp("the feed follows an agent's status with no voyage row touched", { clock: "live" }, function* ({ scripted }) {
	const source = yield* VoyageSource;
	const opened = yield* source.open(reef);
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
