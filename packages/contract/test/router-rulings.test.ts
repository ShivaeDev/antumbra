import { describe, expect, it } from "@effect/vitest";
import { Effect, Stream } from "effect";
import {
	berthReclaim,
	chartAuthority,
	makeRuntime,
	openRulings,
	proclaimedRulingId,
	soundingReading,
	standingRulings,
} from "#fixtures.ts";
import { makeAppRouter } from "#index.ts";

const callerOf = () =>
	makeAppRouter(makeRuntime()).createCaller({ windowId: "console" });

describe("makeAppRouter, on the rulings", () => {
	it.effect("reads every open ruling with its question and choices", () =>
		Effect.gen(function* () {
			const read = yield* Effect.promise(() => callerOf().openRulings());
			expect(read).toEqual(openRulings);
			expect(read.rulings[0]?.choices.map((choice) => choice.label)).toEqual([
				"trust the soundings",
				"trust the chart",
			]);
			expect(read.rulings.map((ruling) => ruling.gatedPieces.length)).toEqual([
				1, 0,
			]);
		}),
	);

	it.effect("the open feed carries the set to a watching window", () =>
		Effect.gen(function* () {
			const iterable = yield* Effect.promise(() =>
				callerOf().openRulingsFeed(),
			);
			const collected = yield* Stream.fromAsyncIterable(
				iterable,
				(cause) => cause,
			).pipe(Stream.runCollect);
			expect(collected.map((view) => view.rulings.length)).toEqual([2]);
		}),
	);

	it.effect("ruling on one answers with the ruling it settled", () =>
		Effect.gen(function* () {
			const ruled = yield* Effect.promise(() =>
				callerOf().ruleOn({
					answer: "plot against the soundings until the shoal is resurveyed",
					choiceId: soundingReading.choices[0]?.id,
					rulingId: soundingReading.id,
				}),
			);
			expect(ruled).toEqual({ rulingId: soundingReading.id });
		}),
	);

	it.effect("a ruling nothing asked comes back refused in its own words", () =>
		Effect.gen(function* () {
			const outcome = yield* Effect.tryPromise(() =>
				callerOf().ruleOn({ answer: "yes", rulingId: "ruling-adrift" }),
			).pipe(Effect.flip);
			expect(String(outcome.cause)).toContain("no open ruling: ruling-adrift");
		}),
	);

	it.effect("reads the standing rulings newest first with their answers", () =>
		Effect.gen(function* () {
			const read = yield* Effect.promise(() => callerOf().standingRulings());
			expect(read).toEqual(standingRulings);
			expect(read.rulings.map((ruling) => ruling.chosen)).toEqual([
				null,
				"trust the soundings",
			]);
		}),
	);

	it.effect("the standing feed carries the set to a watching window", () =>
		Effect.gen(function* () {
			const iterable = yield* Effect.promise(() =>
				callerOf().standingRulingsFeed(),
			);
			const collected = yield* Stream.fromAsyncIterable(
				iterable,
				(cause) => cause,
			).pipe(Stream.runCollect);
			expect(collected.map((view) => view.rulings.length)).toEqual([2]);
		}),
	);

	it.effect("superseding answers with both rulings it bound together", () =>
		Effect.gen(function* () {
			const superseded = yield* Effect.promise(() =>
				callerOf().supersedeRuling({
					byRulingId: berthReclaim.id,
					rulingId: chartAuthority.id,
				}),
			);
			expect(superseded).toEqual({
				byRulingId: berthReclaim.id,
				rulingId: chartAuthority.id,
			});
		}),
	);

	it.effect(
		"a ruling that does not stand comes back refused in its own words",
		() =>
			Effect.gen(function* () {
				const outcome = yield* Effect.tryPromise(() =>
					callerOf().supersedeRuling({
						byRulingId: berthReclaim.id,
						rulingId: soundingReading.id,
					}),
				).pipe(Effect.flip);
				expect(String(outcome.cause)).toContain(
					`no standing ruling: ${soundingReading.id}`,
				);
			}),
	);

	it.effect("withdrawing answers with the ruling it retired", () =>
		Effect.gen(function* () {
			const withdrawn = yield* Effect.promise(() =>
				callerOf().withdrawRuling({
					note: "no berth outlives its branch any more",
					rulingId: berthReclaim.id,
				}),
			);
			expect(withdrawn).toEqual({ rulingId: berthReclaim.id });
		}),
	);

	it.effect("a withdrawal of one that never stood comes back refused", () =>
		Effect.gen(function* () {
			const outcome = yield* Effect.tryPromise(() =>
				callerOf().withdrawRuling({
					note: "it was never ruled",
					rulingId: soundingReading.id,
				}),
			).pipe(Effect.flip);
			expect(String(outcome.cause)).toContain(
				`no standing ruling: ${soundingReading.id}`,
			);
		}),
	);

	it.effect("reclassifying one answers with the ruling it moved", () =>
		Effect.gen(function* () {
			const moved = yield* Effect.promise(() =>
				callerOf().reclassifyRuling({
					note: "the whole fleet plots over this shoal",
					radius: "fleet",
					rulingId: soundingReading.id,
				}),
			);
			expect(moved).toEqual({ rulingId: soundingReading.id });
		}),
	);

	it.effect("a reclassification naming no axis comes back refused", () =>
		Effect.gen(function* () {
			const outcome = yield* Effect.tryPromise(() =>
				callerOf().reclassifyRuling({ rulingId: soundingReading.id }),
			).pipe(Effect.flip);
			expect(String(outcome.cause)).toContain("names no axis");
		}),
	);

	// why: an authority that wants a standing rule asks and answers one ruling,
	// so the whole record travels in a single call and one ruling comes back.
	it.effect("proclaiming answers with the ruling it made stand", () =>
		Effect.gen(function* () {
			const proclaimed = yield* Effect.promise(() =>
				callerOf().proclaimRuling({
					answer: "survey a channel before dredging it",
					context: "two voyages dredged a channel nobody had surveyed",
					question: "May a voyage dredge a channel?",
					radius: "fleet",
					tags: ["dredging"],
					urgency: "eventual",
				}),
			);
			expect(proclaimed).toEqual({ rulingId: proclaimedRulingId });
		}),
	);

	it.effect("refuses a proclamation with no words to stand on", () =>
		Effect.gen(function* () {
			const outcome = yield* Effect.tryPromise(() =>
				callerOf().proclaimRuling({
					answer: "",
					context: "two voyages dredged a channel nobody had surveyed",
					question: "May a voyage dredge a channel?",
					radius: "fleet",
					urgency: "eventual",
				}),
			).pipe(Effect.flip);
			expect(String(outcome.cause)).toContain("length of at least 1");
		}),
	);

	// why: the words are what a later reader is left with, so an empty answer
	// never reaches the record — the boundary refuses it before the source does.
	it.effect("refuses a verdict with no words beside it", () =>
		Effect.gen(function* () {
			const outcome = yield* Effect.tryPromise(() =>
				callerOf().ruleOn({ answer: "", rulingId: soundingReading.id }),
			).pipe(Effect.flip);
			expect(String(outcome.cause)).toContain("length of at least 1");
		}),
	);
});
