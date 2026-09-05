import { HoldSource } from "@antumbra/contract";
import { Effect, Layer } from "effect";
import { makeHoldWaits } from "#hold-waits.ts";
import { toFailure } from "#sight-failure.ts";
import { makeVoyageRefreshes } from "#voyage-feed.ts";

export const HoldSourceLive = Layer.effect(HoldSource)(
	Effect.gen(function* () {
		const refreshes = yield* makeVoyageRefreshes;
		const waits = yield* makeHoldWaits;
		return { holdsFeed: refreshes(waits().pipe(Effect.mapError(toFailure))) };
	}),
);
