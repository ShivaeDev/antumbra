import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { SessionNotLive } from "#errors.ts";
import { makeSessionFabric } from "#fabric.ts";
import {
	idleHandle,
	options,
	scriptedBackend,
	sink,
	textInput,
} from "#test/fabric-fixtures.ts";

const standing = Effect.gen(function* () {
	const queued = yield* Ref.make<ReadonlyArray<string>>([]);
	const backend = scriptedBackend(() =>
		Effect.succeed({
			...idleHandle,
			queue: (input) =>
				Ref.update(queued, (all) => [
					...all,
					...input.parts.flatMap((part) =>
						part.type === "text" ? [part.text] : [],
					),
				]),
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
				yield* fabric.send(options.sessionId, textInput("one more thing"));
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
				fabric.send(options.sessionId, textInput("still aboard?")),
			);
			expect(gone).toBeInstanceOf(SessionNotLive);
			expect(yield* Ref.get(queued)).toEqual([]);
		}),
	),
);
