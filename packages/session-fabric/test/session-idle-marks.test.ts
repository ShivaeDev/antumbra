import { expect, it } from "@effect/vitest";
import { Effect, Ref } from "effect";
import { TestClock } from "effect/testing";
import { SessionNotLive } from "#errors.ts";
import { SessionFabric } from "#fabric.ts";
import { idleHandle, options, scriptedBackend, sink, textInput } from "#test/fabric-fixtures.ts";

const withFabric = Effect.provide(SessionFabric.layer, { local: true });

const standing = Effect.gen(function* () {
	const steered = yield* Ref.make<ReadonlyArray<string>>([]);
	const backend = scriptedBackend(() =>
		Effect.succeed({
			...idleHandle,
			steer: (input) => Ref.update(steered, (all) => [...all, ...input.parts.flatMap((part) => (part.type === "text" ? [part.text] : []))]),
		}),
	);
	const fabric = yield* SessionFabric;
	yield* fabric.withStartAdmission((permit) => fabric.start(permit, "agent-fabric", backend, options, sink, () => Effect.void));
	return { fabric, steered };
});

const endsTurn = (fabric: typeof SessionFabric.Service, sessionId: string) =>
	Effect.flatMap(fabric.turnMark(sessionId), (mark) => fabric.turnEnded(sessionId, mark));

it.live("a turn ending keeps the acquisition and remembers when the rest began", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			expect(yield* fabric.idleSince()).toEqual(new Map());
			yield* endsTurn(fabric, options.sessionId);
			expect(yield* fabric.holds(options.sessionId)).toBe(true);
			expect((yield* fabric.idleSince()).get(options.sessionId)).toBeGreaterThanOrEqual(0);
		}),
	).pipe(withFabric),
);

it.live("a session whose turn has not ended is not reclaimed as idle", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			expect(yield* fabric.stopIdle(options.sessionId)).toBe(false);
			expect(yield* fabric.holds(options.sessionId)).toBe(true);
		}),
	).pipe(withFabric),
);

it.live("words end the idleness, and a reclaim arriving after them declines", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric, steered } = yield* standing;
			yield* endsTurn(fabric, options.sessionId);
			yield* fabric.send(options.sessionId, textInput("one more thing"));
			expect(yield* fabric.idleSince()).toEqual(new Map());
			expect(yield* fabric.stopIdle(options.sessionId)).toBe(false);
			expect(yield* fabric.holds(options.sessionId)).toBe(true);
			expect(yield* Ref.get(steered)).toEqual(["one more thing"]);
		}),
	).pipe(withFabric),
);

it.live("a reclaim takes the attachment of a session still at rest", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric, steered } = yield* standing;
			yield* endsTurn(fabric, options.sessionId);
			expect(yield* fabric.stopIdle(options.sessionId)).toBe(true);
			expect(yield* fabric.holds(options.sessionId)).toBe(false);
			expect(yield* fabric.attached()).toEqual(new Set());
			const gone = yield* Effect.flip(fabric.send(options.sessionId, textInput("still aboard?")));
			expect(gone).toBeInstanceOf(SessionNotLive);
			expect(yield* Ref.get(steered)).toEqual([]);
		}),
	).pipe(withFabric),
);

it.effect("a repeated ending leaves the mark the first one left", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			const mark = yield* fabric.turnMark(options.sessionId);
			expect(yield* fabric.turnEnded(options.sessionId, mark)).toBe("rested");
			const first = (yield* fabric.idleSince()).get(options.sessionId);
			yield* TestClock.adjust(20);

			expect(yield* fabric.turnEnded(options.sessionId, mark)).toBe("rested");
			expect((yield* fabric.idleSince()).get(options.sessionId)).toBe(first);
			expect(yield* fabric.holds(options.sessionId)).toBe(true);
		}),
	).pipe(withFabric),
);

it.live("an ending words have overtaken leaves no mark", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			const before = yield* fabric.turnMark(options.sessionId);
			expect(before?.stirrings).toBe(0);
			yield* fabric.send(options.sessionId, textInput("one more thing"));
			const after = yield* fabric.turnMark(options.sessionId);
			expect(after?.stirrings).toBe(1);

			expect(yield* fabric.turnEnded(options.sessionId, before)).toBe("overtaken");
			expect(yield* fabric.idleSince()).toEqual(new Map());

			expect(yield* fabric.turnEnded(options.sessionId, after)).toBe("rested");
			expect((yield* fabric.idleSince()).get(options.sessionId)).toBeGreaterThanOrEqual(0);

			yield* fabric.send(options.sessionId, textInput("and another"));
			expect(yield* fabric.idleSince()).toEqual(new Map());
			expect((yield* fabric.turnMark(options.sessionId))?.stirrings).toBe(2);
		}),
	).pipe(withFabric),
);

it.effect("an ending nothing is holding is stranded rather than refused", () =>
	Effect.scoped(
		Effect.gen(function* () {
			const { fabric } = yield* standing;
			const mark = yield* fabric.turnMark(options.sessionId);
			yield* fabric.stop(options.sessionId);
			expect(yield* fabric.turnMark(options.sessionId)).toBeUndefined();
			expect(yield* fabric.turnEnded(options.sessionId, mark)).toBe("stranded");
		}),
	).pipe(withFabric),
);
