import { type DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type DatabaseService } from "@antumbra/persistence";
import { type Context, Effect } from "effect";
import { makeEffectApp } from "#effect-app.ts";

interface DomainHarness {
	readonly db: DatabaseService;
}

type DomainServices = Context.Service.Identifier<typeof DomainFeeds>;

const domainHarness = Effect.gen(function* () {
	const db = yield* Database;
	return { db };
});

export const it = {
	effectApp: makeEffectApp<DomainHarness, DomainServices>(() => Effect.succeed({ harness: domainHarness, layer: DomainFeedsLive })),
};
