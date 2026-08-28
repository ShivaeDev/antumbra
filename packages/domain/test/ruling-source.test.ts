import { ChangesLive } from "@antumbra/changes";
import {
	type OpenRulingsView,
	type RulingFailure,
	RulingSource,
} from "@antumbra/contract";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { PiecesLive } from "@antumbra/pieces";
import { Rulings, RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Option, Stream } from "effect";
import { RulingSourceLive } from "#ruling-source.ts";
import { VoyageWorldSourceLive } from "#voyage-world.ts";

const it = persistenceIt();

const layer = RulingSourceLive.pipe(
	Layer.provideMerge(VoyageWorldSourceLive),
	Layer.provideMerge(ChangesLive(new Map(), new Map())),
	Layer.provideMerge(PiecesLive),
	Layer.provideMerge(RulingsLive),
	Layer.provideMerge(DomainFeedsLive),
);

const requesterId = "agent-surveyor";
const voyageId = "voyage-reef";
const pieceId = "piece-course";

const seedFleet = Effect.gen(function* () {
	const db = yield* Database;
	yield* db.Agent.create({
		charter: "sound the eastern shoal",
		id: requesterId,
		role: "hand",
		status: "alive",
	});
	yield* db.Voyage.create({
		backend: "scripted",
		context: "the reef is uncharted",
		id: voyageId,
		name: "Chart the reef",
		northStar: "every shoal is known",
	});
	yield* db.Piece.create({
		charter: "plot a course over the shoal",
		expectation: "a course is plotted",
		id: pieceId,
		role: "navigator",
		title: "Plot the course",
	});
	yield* db.VoyagePiece.create({ pieceId, voyageId });
});

const asked = {
	choices: [
		{ detail: "the sounding is fresher", label: "trust the soundings" },
		{ label: "trust the chart" },
	],
	context: "the chart and the soundings disagree over the eastern shoal",
	question: "which reading do we plot against?",
	radius: "voyage",
	requesterAgentId: requesterId,
	subjects: [
		{ id: voyageId, kind: "voyage" },
		{ kind: "tag", tag: "surveying" },
	],
	urgency: "blocking",
} as const;

// why: the watcher must hold the feed's opening snapshot before the act under
// test lands, or an emission it never reacted to would pass for one.
const watchUntil = (
	feed: Stream.Stream<OpenRulingsView, RulingFailure>,
	matches: (view: OpenRulingsView) => boolean,
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

const anyOpen = (view: OpenRulingsView) => view.rulings.length > 0;
const noneOpen = (view: OpenRulingsView) => view.rulings.length === 0;
const anyGated = (view: OpenRulingsView) =>
	view.rulings.some((ruling) => ruling.gatedPieces.length > 0);

it.effectDB(
	"the open feed carries a request the moment it lands",
	function* () {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;
			const source = yield* RulingSource;
			const watcher = yield* watchUntil(source.openFeed, anyOpen);

			yield* rulings.request(asked);

			const seen = yield* Fiber.join(watcher);
			expect(seen[0]?.rulings).toEqual([
				{
					choices: [
						{
							detail: "the sounding is fresher",
							id: expect.any(String),
							label: "trust the soundings",
						},
						{ detail: null, id: expect.any(String), label: "trust the chart" },
					],
					context: asked.context,
					gatedPieces: [],
					id: expect.any(String),
					question: asked.question,
					radius: "voyage",
					requestedAt: expect.any(String),
					requesterAgentId: requesterId,
					subjects: expect.arrayContaining([
						{ kind: "voyage", label: voyageId },
						{ kind: "tag", label: "surveying" },
					]),
					urgency: "blocking",
				},
			]);
		}).pipe(Effect.provide(layer));
	},
);

// why: the admiral prioritises a ruling by what it releases, so a gate that
// lands after the request reaches the window as the piece's title and voyage
// without anyone asking again.
it.effectDB(
	"the open feed names the piece a gate holds the moment it lands",
	function* () {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;
			const source = yield* RulingSource;
			const requested = yield* rulings.request(asked);
			const watcher = yield* watchUntil(source.openFeed, anyGated);

			yield* rulings.gate({ pieceIds: [pieceId], rulingId: requested.id });

			const seen = yield* Fiber.join(watcher);
			expect(seen[0]?.rulings[0]?.gatedPieces).toEqual([
				{
					pieceId,
					title: "Plot the course",
					voyageId,
					voyageName: "Chart the reef",
				},
			]);
		}).pipe(Effect.provide(layer));
	},
);

// why: what holds an asker is met before what merely binds widely, and the
// window shows the set in the order the record hands it over.
it.effectDB(
	"reads the open set in the order it should be answered",
	function* () {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;
			const source = yield* RulingSource;
			yield* rulings.request({ ...asked, subjects: [], urgency: "eventual" });
			yield* rulings.request({ ...asked, subjects: [], urgency: "blocking" });

			const open = yield* source.open;

			expect(open.rulings.map((ruling) => ruling.urgency)).toEqual([
				"blocking",
				"eventual",
			]);
		}).pipe(Effect.provide(layer));
	},
);

it.effectDB("a verdict answers the record and empties the feed", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const requested = yield* rulings.request(asked);
		const watcher = yield* watchUntil(source.openFeed, noneOpen);

		const receipt = yield* source.rule({
			answer: "plot against the soundings until the shoal is resurveyed",
			choiceId: requested.choices[0]?.id,
			rulingId: requested.id,
		});

		expect(receipt).toEqual({ rulingId: requested.id });
		const ruled = yield* rulings.get(requested.id);
		expect(Option.getOrUndefined(ruled.answer)).toMatchObject({
			by: "admiral",
			text: "plot against the soundings until the shoal is resurveyed",
		});
		expect(yield* Fiber.join(watcher)).toHaveLength(1);
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a second verdict on a ruling that stands", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const requested = yield* rulings.request(asked);
		yield* source.rule({ answer: "trust the chart", rulingId: requested.id });

		const refused = yield* Effect.flip(
			source.rule({ answer: "no, the soundings", rulingId: requested.id }),
		);

		expect(refused).toMatchObject({
			_tag: "RulingRefused",
			reason: `ruling ${requested.id} was already ruled`,
		});
	}).pipe(Effect.provide(layer));
});

it.effectDB("refuses a verdict on a ruling nothing asked", function* () {
	yield* Effect.gen(function* () {
		const source = yield* RulingSource;

		const refused = yield* Effect.flip(
			source.rule({ answer: "yes", rulingId: "ruling-adrift" }),
		);

		expect(refused).toMatchObject({
			_tag: "RulingRefused",
			reason: "no open ruling: ruling-adrift",
		});
	}).pipe(Effect.provide(layer));
});
