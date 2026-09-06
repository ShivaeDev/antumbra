import { it } from "@effect/vitest";
import { Clock, Effect, Layer } from "effect";
import { expect } from "vitest";
import * as Journal from "#journal.ts";
import { launched, pieceApp, pieceId } from "#test/kit.ts";
import { kit } from "#testing/kit.ts";

const layer = Layer.provideMerge(Journal.layer(pieceApp), Journal.memory());

const runs = Array.from({ length: 1000 }, (_, index) => index + 1);

const percentile = (sorted: readonly number[], share: number): number => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * share))] ?? 0;

const milliseconds = (nanos: number): string => (nanos / 1e6).toFixed(3);

it.live(
	"a thousand commits in a row all land",
	() =>
		Effect.gen(function* () {
			const parts = yield* kit(pieceApp);
			yield* Effect.forEach(runs, (index) => parts.seed.piece(launched(index)), { discard: true });
			const durations: number[] = [];
			for (const index of runs) {
				const before = yield* Clock.currentTimeNanos;
				yield* parts.commit.pieces.park({ pieceId: pieceId(index), reason: "sweep" });
				durations.push(Number((yield* Clock.currentTimeNanos) - before));
			}
			const sorted = durations.toSorted((left, right) => left - right);
			yield* Effect.logInfo(
				`commit latency over ${runs.length} runs: p50 ${milliseconds(percentile(sorted, 0.5))} ms, p99 ${milliseconds(percentile(sorted, 0.99))} ms`,
			);
			expect(yield* parts.rows.piece.count({ status: "parked" })).toBe(runs.length);
		}).pipe(Effect.provide(layer), Effect.orDie),
	120_000,
);
