import { DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type DatabaseService } from "@antumbra/persistence";
import {
	acquireTemporaryPersistence,
	type TemporaryPersistence,
} from "@antumbra/persistence/testing";
import { Rulings, RulingsLive } from "@antumbra/rulings";
import { Effect, Layer } from "effect";
import { type Around, makeEffectIt } from "#effect-it.ts";

export interface RulingsHarness {
	readonly db: DatabaseService;
	readonly rulings: (typeof Rulings)["Service"];
}

const rulingsLayer = (temporary: TemporaryPersistence) =>
	RulingsLive.pipe(
		Layer.provideMerge(DomainFeedsLive),
		Layer.provideMerge(temporary.layer),
	);

const withRulings: Around<RulingsHarness> = (body) =>
	Effect.gen(function* () {
		const temporary = yield* acquireTemporaryPersistence;
		return yield* Effect.gen(function* () {
			return yield* body({
				db: yield* Database,
				rulings: yield* Rulings,
			});
		}).pipe(Effect.provide(rulingsLayer(temporary)));
	});

export const it = makeEffectIt(withRulings);
