import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { SessionNotLive } from "#errors.ts";
import { makeSessionFabric } from "#fabric.ts";
import {
	idleHandle,
	options,
	scriptedBackend,
	sink,
} from "#test/fabric-fixtures.ts";

const standing = Effect.gen(function* () {
	const queued = yield* Ref.make<ReadonlyArray<string>>([]);
	const backend = scriptedBackend(() =>
		Effect.succeed({
			...idleHandle,
			queue: (text: string) => Ref.update(queued, (all) => [...all, text]),
		}),
	);
	const fabric = yield* makeSessionFabric;
	yield* fabric.withStartAdmission((permit) =>
		fabric.start(
			permit,
			"agent-fabric",
			backend,
			options,
			sink,
			() => Effect.void,
		),
	);
	return { fabric, queued };
});

// why: the correction in one claim — declaring there is nothing to do leaves
// the acquisition exactly where it was, and only records the moment the quiet
// began so something else can decide later what to do about it.
it.live("standing down keeps the acquisition and remembers when it began", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			expect(yield* fabric.idleSince).toEqual(new Map());
			yield* fabric.standDown(options.sessionId);
			expect(yield* fabric.holds(options.sessionId)).toBe(true);
			expect(
				(yield* fabric.idleSince).get(options.sessionId),
			).toBeGreaterThanOrEqual(0);
		}),
	),
);

// why: a Session mid-turn is not the idle path's to take, however long the
// process has been alive.
it.live("a session that never stood down is not reclaimed as idle", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			expect(yield* fabric.stopIdle(options.sessionId)).toBe(false);
			expect(yield* fabric.holds(options.sessionId)).toBe(true);
		}),
	),
);

// why: the race the whole design turns on. Words and a reclaim can arrive in
// either order, and the one that arrives second must not undo the first — so
// speaking to a Session ends its idleness, and a reclaim that finds no idleness
// leaves the attachment alone rather than taking it out from under the words.
it.live(
	"words end the idleness, and a reclaim arriving after them declines",
	() =>
		Effect.scoped(
			Effect.gen(function* () {
				const { fabric, queued } = yield* standing;
				yield* fabric.standDown(options.sessionId);
				yield* fabric.send(options.sessionId, "one more thing");
				expect(yield* fabric.idleSince).toEqual(new Map());
				expect(yield* fabric.stopIdle(options.sessionId)).toBe(false);
				expect(yield* fabric.holds(options.sessionId)).toBe(true);
				expect(yield* Ref.get(queued)).toEqual(["one more thing"]);
			}),
		),
);

// why: and the other order. A reclaim that wins takes the attachment for good,
// and the words that follow find nothing to hand themselves to — which is the
// signal the caller needs to resume the conversation instead.
it.live("a reclaim takes the attachment of a session still standing down", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric, queued } = yield* standing;
			yield* fabric.standDown(options.sessionId);
			expect(yield* fabric.stopIdle(options.sessionId)).toBe(true);
			expect(yield* fabric.holds(options.sessionId)).toBe(false);
			expect(yield* fabric.attached).toEqual(new Set());
			const gone = yield* Effect.flip(
				fabric.send(options.sessionId, "still aboard?"),
			);
			expect(gone).toBeInstanceOf(SessionNotLive);
			expect(yield* Ref.get(queued)).toEqual([]);
		}),
	),
);

// why: one mark, reached two ways. A turn ending is the provider saying the
// work is over and a declaration is the Agent saying it, and the clock reads
// neither — it reads the moment the quiet began, which is whichever of them
// came first and never the last one to repeat it.
it.live("an ending leaves the same mark a declaration left, once", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			yield* fabric.standDown(options.sessionId);
			const declared = (yield* fabric.idleSince).get(options.sessionId);
			yield* Effect.sleep(20);

			expect(yield* fabric.turnEnded(options.sessionId, 0)).toBe(true);
			expect((yield* fabric.idleSince).get(options.sessionId)).toBe(declared);
			yield* Effect.sleep(20);

			expect(yield* fabric.turnEnded(options.sessionId, 0)).toBe(true);
			expect((yield* fabric.idleSince).get(options.sessionId)).toBe(declared);
			expect(yield* fabric.holds(options.sessionId)).toBe(true);
		}),
	),
);

// why: the count is what tells an ending that belongs to the turn just over
// from one the next turn's words have already overtaken. The overtaken one
// leaves no mark at all — a Session with work in front of it is not resting —
// and the ending taken after the words is the one that counts.
it.live("an ending words have overtaken leaves no mark", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			expect(yield* fabric.stirrings(options.sessionId)).toBe(0);
			yield* fabric.send(options.sessionId, "one more thing");
			expect(yield* fabric.stirrings(options.sessionId)).toBe(1);

			expect(yield* fabric.turnEnded(options.sessionId, 0)).toBe(false);
			expect(yield* fabric.idleSince).toEqual(new Map());

			expect(yield* fabric.turnEnded(options.sessionId, 1)).toBe(true);
			expect(
				(yield* fabric.idleSince).get(options.sessionId),
			).toBeGreaterThanOrEqual(0);

			// why: and the words after that end the quiet again, exactly as they end
			// the quiet a declaration left.
			yield* fabric.send(options.sessionId, "and another");
			expect(yield* fabric.idleSince).toEqual(new Map());
			expect(yield* fabric.stirrings(options.sessionId)).toBe(2);
		}),
	),
);
