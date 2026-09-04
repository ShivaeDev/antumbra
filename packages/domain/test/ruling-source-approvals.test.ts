import { RulingSource } from "@antumbra/contract";
import { persistenceIt } from "@antumbra/persistence/testing";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option } from "effect";
import { layer, pieceId, requesterId, seedFleet, voyageId } from "#test/ruling-source-harness.ts";

const it = persistenceIt();

const plot = { context: "plot the course before anything sails", pieceIds: [pieceId], requesterAgentId: requesterId, voyageId };

it.effectDB("the window sees an approval request with the pieces it asks for", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;

		const asked = yield* rulings.requestApproval(plot);

		const open = yield* source.open;
		expect(open.rulings).toEqual([
			expect.objectContaining({
				approvedPieces: [{ pieceId, title: "Plot the course" }],
				id: asked.id,
				kind: "approval",
				rung: { kind: "admiral" },
			}),
		]);
	}).pipe(Effect.provide(layer));
});

it.effectDB("the window refuses an approval verdict that picks neither approve nor redirect", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const source = yield* RulingSource;
		const asked = yield* rulings.requestApproval(plot);

		const failure = yield* Effect.flip(source.rule({ answer: "looks right", rulingId: asked.id }));
		const receipt = yield* source.rule({
			answer: "sail it",
			choiceId: asked.choices.find((choice) => choice.label === "approve")?.id,
			rulingId: asked.id,
		});

		expect(failure).toEqual(expect.objectContaining({ _tag: "RulingRefused", reason: `approval ${asked.id} is answered with approve or redirect` }));
		expect(receipt).toEqual({ rulingId: asked.id });
		expect(Option.isSome((yield* rulings.get(asked.id)).answer)).toBe(true);
	}).pipe(Effect.provide(layer));
});
