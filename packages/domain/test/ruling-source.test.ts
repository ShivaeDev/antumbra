import { RulingSource } from "@antumbra/contract";
import { persistenceIt } from "@antumbra/persistence/testing";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Fiber, Option } from "effect";
import { anyGated, anyOpen, asked, layer, noneOpen, pieceId, requesterId, seedFleet, voyageId, watchUntil } from "#test/ruling-source-harness.ts";

const it = persistenceIt();

it.effectDB("the open feed carries a request the moment it lands", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const watcher = yield* watchUntil(source.openFeed, anyOpen);

		yield* rulings.request(asked);

		const seen = yield* Fiber.join(watcher);
		expect(seen[0]?.rulings).toEqual([
			{
				approvedPieces: [],
				choices: [
					{
						detail: "the sounding is fresher",
						id: expect.any(String),
						label: "trust the soundings",
					},
					{ detail: null, id: expect.any(String), label: "trust the chart" },
				],
				context: asked.context,
				declared: { radius: "voyage", urgency: "blocking" },
				gatedPieces: [],
				id: expect.any(String),
				kind: "ruling",
				question: asked.question,
				radius: "voyage",
				reclassifications: [],
				requestedAt: expect.any(String),
				requester: { agentId: requesterId, kind: "agent" },
				rung: { kind: "captain", voyageId, voyageName: "Chart the reef" },
				subjects: expect.arrayContaining([
					{ kind: "voyage", label: voyageId },
					{ kind: "tag", label: "surveying" },
				]),
				urgency: "blocking",
			},
		]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("the open feed names the piece a gate holds the moment it lands", function* () {
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
});

it.effectDB("reads the open set in the order it should be answered", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		yield* rulings.request({ ...asked, subjects: [], urgency: "eventual" });
		yield* rulings.request({ ...asked, subjects: [], urgency: "blocking" });

		const open = yield* source.open;

		expect(open.rulings.map((ruling) => ruling.urgency)).toEqual(["blocking", "eventual"]);
	}).pipe(Effect.provide(layer));
});

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

it.effectDB("a reclassification is seen beside the declaration", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const requested = yield* rulings.request(asked);

		const receipt = yield* source.reclassify({
			note: "every voyage plots over this shoal",
			radius: "fleet",
			rulingId: requested.id,
		});

		expect(receipt).toEqual({ rulingId: requested.id });
		const open = yield* source.open;
		expect(open.rulings[0]).toMatchObject({
			declared: { radius: "voyage", urgency: "blocking" },
			radius: "fleet",
			reclassifications: [
				{
					at: expect.any(String),
					by: "admiral",
					note: "every voyage plots over this shoal",
					radius: "fleet",
				},
			],
			urgency: "blocking",
		});
		expect(open.rulings[0]?.reclassifications[0]).not.toHaveProperty("urgency");
	}).pipe(Effect.provide(layer));
});

it.effectDB("a proclamation stands without ever being open", function* () {
	yield* Effect.gen(function* () {
		const source = yield* RulingSource;

		const receipt = yield* source.proclaim({
			answer: "survey a channel before dredging it",
			context: "two voyages dredged a channel nobody had surveyed",
			question: "May a voyage dredge a channel?",
			radius: "fleet",
			tags: ["dredging"],
			urgency: "eventual",
		});

		expect(yield* source.open).toEqual({ rulings: [] });
		const standing = yield* source.standing;
		expect(standing.rulings).toEqual([
			{
				answer: "survey a channel before dredging it",
				chosen: null,
				id: receipt.rulingId,
				question: "May a voyage dredge a channel?",
				radius: "fleet",
				ruledAt: expect.any(String),
				ruledBy: "admiral",
				ruledByAgentId: null,
				stale: false,
				subjects: [{ kind: "tag", label: "dredging" }],
				urgency: "eventual",
			},
		]);
	}).pipe(Effect.provide(layer));
});
