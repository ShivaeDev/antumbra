import { RulingSource } from "@antumbra/contract";
import { persistenceIt } from "@antumbra/persistence/testing";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import {
	anyGated,
	anyOpen,
	asked,
	layer,
	noneOpen,
	pieceId,
	requesterId,
	seedFleet,
	voyageId,
	watchUntil,
} from "#test/ruling-source-harness.ts";

const it = persistenceIt();

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
