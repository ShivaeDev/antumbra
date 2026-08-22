import {
	type SightFailure,
	VoyageSource,
	type VoyageView,
} from "@antumbra/contract";
import { Database, Writer } from "@antumbra/persistence";
import type { TemporaryPersistence } from "@antumbra/persistence/testing";
import { expect, it } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Stream } from "effect";
import {
	acquireTemporaryPersistence,
	domainKernelLayer,
	makeScriptedBackend,
	type ScriptedBackend,
} from "#test/harness.ts";
import { eventually, retireOneAlive } from "#test/voyage-fixtures.ts";
import { VoyageSourceLive } from "#voyage-source.ts";

const voyageLayer = (
	temporary: TemporaryPersistence,
	scripted: ScriptedBackend,
) =>
	VoyageSourceLive.pipe(
		Layer.provideMerge(domainKernelLayer(temporary, scripted.backend)),
	);

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

const anyReady = (view: VoyageView) =>
	view.pieces.some((piece) => piece.state === "ready");

const captainRetired = (view: VoyageView) => view.captain?.status === "retired";

// why: the watcher must have taken the feed's opening snapshot before the act
// under test lands, or an emission it never reacted to would pass for one.
const watchUntil = (
	feed: Stream.Stream<VoyageView, SightFailure>,
	matches: (view: VoyageView) => boolean,
) =>
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

it.live("the list and the read carry the state the domain derived", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const source = yield* VoyageSource;
			const opened = yield* source.open(reef);
			expect(opened.state).toBe("quiet");
			expect(opened.captain).toBeNull();
			const piece = yield* source.charterPiece(soundings(opened.id));
			yield* source.launch(piece.pieceId);
			const listed = yield* source.voyages;
			expect(listed.map((row) => row.counts)).toEqual([
				{ active: 0, done: 0, pieces: 1, ready: 1 },
			]);
			const view = yield* source.voyage(opened.id);
			expect(view.context).toBe(reef.context);
			expect(view.pieces.map((row) => row.state)).toEqual(["ready"]);
			expect(view.pieces[0]?.launchedAt).toEqual(expect.any(String));
		}).pipe(Effect.provide(voyageLayer(temporary, scripted)));
	}),
);

it.live("a board entry the window writes carries no author agent", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
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
					register: "smooth",
				},
			]);
		}).pipe(Effect.provide(voyageLayer(temporary, scripted)));
	}),
);

it.live("a voyage read carries each piece's own log", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
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
		}).pipe(Effect.provide(voyageLayer(temporary, scripted)));
	}),
);

it.live("a hail puts a captain and a crew row on what the window reads", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const source = yield* VoyageSource;
			const opened = yield* source.open(reef);
			const hailed = yield* source.hail(opened.id);
			yield* eventually(
				Effect.gen(function* () {
					const view = yield* source.voyage(opened.id);
					expect(view.captain).toEqual({
						agentId: hailed.agentId,
						atWork: true,
						status: "alive",
					});
					expect(view.crew).toEqual([
						{ agentId: hailed.agentId, role: "captain", status: "alive" },
					]);
					expect(view.state).toBe("underWay");
				}),
			);
		}).pipe(Effect.provide(voyageLayer(temporary, scripted)));
	}),
);

it.live("voyage projection rejects an unknown stored Agent status", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const db = yield* Database;
			const source = yield* VoyageSource;
			const writer = yield* Writer;
			const opened = yield* source.open(reef);
			const hailed = yield* source.hail(opened.id);
			yield* eventually(
				Effect.gen(function* () {
					const view = yield* source.voyage(opened.id);
					expect(view.captain?.status).toBe("alive");
				}),
			);
			yield* writer.write(
				db.Agent.where({ id: hailed.agentId }).update({
					status: "future-agent",
				}),
			);
			const failure = yield* Effect.flip(source.voyage(opened.id));
			expect(failure._tag).toBe("SightFailure");
			expect(failure.message).toContain("future-agent");
		}).pipe(Effect.provide(voyageLayer(temporary, scripted)));
	}),
);

it.live("the feed shows the piece as ready once it is launched", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const source = yield* VoyageSource;
			const opened = yield* source.open(reef);
			const piece = yield* source.charterPiece(soundings(opened.id));
			const watcher = yield* watchUntil(source.voyageFeed(opened.id), anyReady);
			yield* source.launch(piece.pieceId);
			const seen = yield* Fiber.join(watcher);
			expect(seen[0]?.pieces.map((row) => row.id)).toEqual([piece.pieceId]);
		}).pipe(Effect.provide(voyageLayer(temporary, scripted)));
	}),
);

// why: retiring writes no voyage row at all — the view moves only because the
// agent's status did, which is the whole reason the fleet feed is watched too.
it.live("the feed follows an agent's status with no voyage row touched", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const source = yield* VoyageSource;
			const opened = yield* source.open(reef);
			const hailed = yield* source.hail(opened.id);
			yield* eventually(
				Effect.gen(function* () {
					const view = yield* source.voyage(opened.id);
					expect(view.captain?.status).toBe("alive");
				}),
			);
			const watcher = yield* watchUntil(
				source.voyageFeed(opened.id),
				captainRetired,
			);
			yield* retireOneAlive;
			const seen = yield* Fiber.join(watcher);
			expect(seen[0]?.captain?.agentId).toBe(hailed.agentId);
			expect(seen[0]?.state).toBe("quiet");
		}).pipe(Effect.provide(voyageLayer(temporary, scripted)));
	}),
);

it.live("a voyage nobody opened is a failure, never an empty view", () =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		const scripted = yield* makeScriptedBackend;
		yield* Effect.gen(function* () {
			const source = yield* VoyageSource;
			const outcome = yield* source.voyage("ghost").pipe(Effect.flip);
			expect(outcome._tag).toBe("SightFailure");
			expect(outcome.message).toContain("no such voyage: ghost");
		}).pipe(Effect.provide(voyageLayer(temporary, scripted)));
	}),
);
