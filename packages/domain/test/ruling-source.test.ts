import {
	type OpenRulingsView,
	type RulingFailure,
	RulingSource,
	type StandingRulingsView,
} from "@antumbra/contract";
import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { persistenceIt } from "@antumbra/persistence/testing";
import { Rulings, RulingsLive } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Deferred, Effect, Fiber, Layer, Option, Stream } from "effect";
import { RulingSourceLive } from "#ruling-source.ts";

const it = persistenceIt();

const layer = RulingSourceLive.pipe(
	Layer.provideMerge(RulingsLive),
	Layer.provideMerge(DomainFeedsLive),
);

const requesterId = "agent-surveyor";
const voyageId = "voyage-reef";

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
const watchUntil = <A>(
	feed: Stream.Stream<A, RulingFailure>,
	matches: (view: A) => boolean,
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
const oneStanding = (view: StandingRulingsView) => view.rulings.length === 1;

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

it.effectDB(
	"a supersession drops the older ruling from the standing feed",
	function* () {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;
			const source = yield* RulingSource;
			const older = yield* rulings.request(asked);
			const newer = yield* rulings.request(asked);
			yield* source.rule({ answer: "trust the chart", rulingId: older.id });
			yield* source.rule({
				answer: "the soundings are fresher; plot against them",
				choiceId: newer.choices[0]?.id,
				rulingId: newer.id,
			});
			const watcher = yield* watchUntil(source.standingFeed, oneStanding);

			const receipt = yield* source.supersede({
				byRulingId: newer.id,
				rulingId: older.id,
			});

			expect(receipt).toEqual({ byRulingId: newer.id, rulingId: older.id });
			const seen = yield* Fiber.join(watcher);
			expect(seen[0]?.rulings).toEqual([
				{
					answer: "the soundings are fresher; plot against them",
					chosen: "trust the soundings",
					id: newer.id,
					question: asked.question,
					radius: "voyage",
					ruledAt: expect.any(String),
					ruledBy: "admiral",
					subjects: expect.arrayContaining([
						{ kind: "voyage", label: voyageId },
						{ kind: "tag", label: "surveying" },
					]),
					urgency: "blocking",
				},
			]);
			const superseded = yield* rulings.get(older.id);
			expect(Option.getOrUndefined(superseded.supersession)).toMatchObject({
				by: "admiral",
				byRulingId: newer.id,
			});
		}).pipe(Effect.provide(layer));
	},
);

it.effectDB(
	"refuses a supersession the record refuses, in its words",
	function* () {
		yield* Effect.gen(function* () {
			yield* seedFleet;
			const rulings = yield* Rulings;
			const source = yield* RulingSource;
			const standing = yield* rulings.request(asked);
			const open = yield* rulings.request(asked);
			yield* source.rule({ answer: "trust the chart", rulingId: standing.id });

			const unruled = yield* Effect.flip(
				source.supersede({ byRulingId: open.id, rulingId: standing.id }),
			);
			const itself = yield* Effect.flip(
				source.supersede({ byRulingId: standing.id, rulingId: standing.id }),
			);
			const adrift = yield* Effect.flip(
				source.supersede({
					byRulingId: standing.id,
					rulingId: "ruling-adrift",
				}),
			);

			expect(unruled).toMatchObject({
				_tag: "RulingRefused",
				reason: `ruling ${open.id} has not been ruled`,
			});
			expect(itself).toMatchObject({
				_tag: "RulingRefused",
				reason: `ruling ${standing.id} cannot supersede itself`,
			});
			expect(adrift).toMatchObject({
				_tag: "RulingRefused",
				reason: "no ruling: ruling-adrift",
			});
		}).pipe(Effect.provide(layer));
	},
);
