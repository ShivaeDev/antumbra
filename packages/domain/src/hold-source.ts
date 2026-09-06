import { HoldSource } from "@antumbra/contract";
import { Effect, Layer } from "effect";
import { HoldWaits } from "#hold-waits/service.ts";
import { toFailure } from "#sight-failure.ts";
import { makeVoyageRefreshes } from "#voyage-feed.ts";

export const HoldSourceLive = Layer.effect(HoldSource)(
	Effect.gen(function* () {
		const refreshes = yield* makeVoyageRefreshes;
		const waits = yield* HoldWaits;
		return { holdsFeed: refreshes(waits.read().pipe(Effect.mapError(toFailure))) };
	}),
);
