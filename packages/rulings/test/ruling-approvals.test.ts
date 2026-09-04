import { DomainFeeds } from "@antumbra/domain-feeds";
import { Rulings } from "@antumbra/rulings";
import { expect } from "@effect/vitest";
import { Effect, Option, PubSub } from "effect";
import { TestClock } from "effect/testing";
import { it, layer, pieceId, requesterId, secondPieceId, seedFleet, voyageId } from "#test/rulings-harness.ts";

const plot = {
	context: "sound the shallows before buoying the channel",
	pieceIds: [pieceId],
	requesterAgentId: requesterId,
	voyageId,
} as const;

const choice = (approval: { readonly choices: ReadonlyArray<{ readonly id: string; readonly label: string }> }, label: string): string =>
	approval.choices.find((offered) => offered.label === label)?.id ?? "";

const approved = (pieceIds: ReadonlyArray<string>) =>
	Effect.gen(function* () {
		const rulings = yield* Rulings;
		const asked = yield* rulings.requestApproval({ ...plot, pieceIds });
		yield* rulings.rule({ answer: "sail it", by: "admiral", choiceId: choice(asked, "approve"), rulingId: asked.id });
		return asked;
	});

it.effectApp("an approval request records the plot and waits on the admiral", function* () {
	yield* Effect.scoped(
		Effect.gen(function* () {
			yield* seedFleet;
			const feeds = yield* DomainFeeds;
			const rulings = yield* Rulings;
			const rulingNotices = yield* feeds.subscribeRulingRefresh();
			const voyageNotices = yield* feeds.subscribeVoyageRefresh();

			const asked = yield* rulings.requestApproval(plot);

			expect(yield* PubSub.take(rulingNotices)).toBeUndefined();
			expect(yield* PubSub.take(voyageNotices)).toBeUndefined();
			expect(asked).toMatchObject({
				approvedPieceIds: [pieceId],
				context: plot.context,
				kind: "approval",
				radius: "voyage",
				requester: { agentId: requesterId, kind: "agent" },
				rung: Option.some("admiral"),
				urgency: "pressing",
			});
			expect(asked.choices.map((offered) => offered.label)).toEqual(["approve", "redirect"]);
			expect(asked.subjects).toEqual([
				{ id: voyageId, kind: "voyage" },
				{ id: requesterId, kind: "agent" },
			]);
			expect((yield* rulings.open()).map((open) => open.id)).toEqual([asked.id]);
			expect(yield* rulings.approvals()).toEqual([
				{ approvalId: asked.id, pieceIds: [pieceId], requestedAt: asked.createdAt, ruledAt: null, voyageId },
			]);
		}),
	).pipe(Effect.provide(layer));
});

it.effectApp("refuses to put an empty plot before the admiral", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;

		const failure = yield* Effect.flip(rulings.requestApproval({ ...plot, pieceIds: [] }));

		expect(failure).toMatchObject({ _tag: "PlotEmpty", voyageId });
		expect(yield* rulings.open()).toEqual([]);
	}).pipe(Effect.provide(layer));
});

it.effectApp("refuses a second request while the first is unanswered", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const asked = yield* rulings.requestApproval(plot);

		const failure = yield* Effect.flip(rulings.requestApproval({ ...plot, pieceIds: [pieceId, secondPieceId] }));

		expect(failure).toMatchObject({ _tag: "ApprovalAlreadyOpen", approvalId: asked.id, voyageId });
		expect(yield* rulings.open()).toHaveLength(1);
	}).pipe(Effect.provide(layer));
});

it.effectApp("refuses the plot that already stands approved", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const standing = yield* approved([pieceId, secondPieceId]);

		const failure = yield* Effect.flip(rulings.requestApproval({ ...plot, pieceIds: [secondPieceId, pieceId] }));

		expect(failure).toMatchObject({ _tag: "PlotUnchanged", approvalId: standing.id, voyageId });
		expect(yield* rulings.open()).toEqual([]);
	}).pipe(Effect.provide(layer));
});

it.effectApp("an approval is answered with approve or redirect, never words alone", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const asked = yield* rulings.requestApproval(plot);

		const failure = yield* Effect.flip(rulings.rule({ answer: "looks right", by: "admiral", rulingId: asked.id }));

		expect(failure).toMatchObject({ _tag: "ApprovalChoiceRequired", rulingId: asked.id });
		expect(Option.isNone((yield* rulings.get(asked.id)).answer)).toBe(true);
	}).pipe(Effect.provide(layer));
});

it.effectApp("approving a second plot supersedes the first in the same act", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const first = yield* approved([pieceId]);
		yield* TestClock.adjust(1_000);

		const second = yield* approved([pieceId, secondPieceId]);

		const superseded = yield* rulings.get(first.id);
		expect(Option.getOrThrow(superseded.supersession)).toMatchObject({ by: "admiral", byRulingId: second.id });
		expect((yield* rulings.approvals()).map((approval) => [approval.approvalId, approval.pieceIds])).toEqual([[second.id, [secondPieceId, pieceId]]]);
		expect((yield* rulings.standing([])).map((standing) => standing.id)).toEqual([second.id]);
	}).pipe(Effect.provide(layer));
});

it.effectApp("a redirect leaves the approved set where it was", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const first = yield* approved([pieceId]);
		const asked = yield* rulings.requestApproval({ ...plot, pieceIds: [pieceId, secondPieceId] });

		const redirected = yield* rulings.rule({
			answer: "buoy nothing until the soundings land",
			by: "admiral",
			choiceId: choice(asked, "redirect"),
			rulingId: asked.id,
		});

		expect(Option.getOrThrow(redirected.answer).text).toBe("buoy nothing until the soundings land");
		expect(Option.isNone((yield* rulings.get(first.id)).supersession)).toBe(true);
		expect((yield* rulings.approvals()).map((approval) => approval.approvalId)).toEqual([first.id]);
		expect((yield* rulings.requestApproval({ ...plot, pieceIds: [secondPieceId] })).kind).toBe("approval");
	}).pipe(Effect.provide(layer));
});

it.effectApp("no captain answers an approval, the flagship included", function* () {
	yield* Effect.gen(function* () {
		yield* seedFleet;
		const rulings = yield* Rulings;
		const asked = yield* rulings.requestApproval(plot);
		const verdict = { answer: "sail it", choiceId: choice(asked, "approve"), rulingId: asked.id };

		const byCaptain = yield* Effect.flip(rulings.rule({ ...verdict, by: "captain", byAgentId: requesterId }));
		const byFlagship = yield* Effect.flip(rulings.rule({ ...verdict, by: "flagship" }));

		expect(byCaptain).toMatchObject({ _tag: "RulingBelowRung", by: "captain", rung: "admiral" });
		expect(byFlagship).toMatchObject({ _tag: "RulingBelowRung", by: "flagship", rung: "admiral" });
		expect(Option.isNone((yield* rulings.get(asked.id)).answer)).toBe(true);
	}).pipe(Effect.provide(layer));
});
