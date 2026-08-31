import { type DomainFeeds, DomainFeedsLive } from "@antumbra/domain-feeds";
import { Database, type DatabaseService } from "@antumbra/persistence";
import { type Context, Effect } from "effect";
import { makeEffectApp } from "#it.ts";

interface DomainHarness {
	readonly db: DatabaseService;
}

type DomainRequirements = Context.Service.Identifier<typeof Database> | Context.Service.Identifier<typeof DomainFeeds>;

const runWithDomain = <A, E>(body: (harness: DomainHarness) => Effect.fn.Return<A, E, DomainRequirements>) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* body({ db });
	}).pipe(Effect.provide(DomainFeedsLive));

export const it = { effectApp: makeEffectApp<DomainHarness, DomainRequirements>(runWithDomain) };
