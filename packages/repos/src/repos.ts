import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Context, Effect, Layer, Semaphore } from "effect";
import { forgetRepo } from "#forget.ts";
import { listRepos } from "#list.ts";
import type { RepoRegistry } from "#model.ts";
import { registerRepo } from "#register.ts";

export class Repos extends Context.Service<Repos, RepoRegistry>()(
	"@antumbra/repos/Repos",
) {}

export const ReposLive = Layer.effect(Repos)(
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const registrationGate = yield* Semaphore.make(1);
		const context = Context.make(Database, db).pipe(
			Context.add(DomainFeeds, feeds),
		);
		return {
			forget: (id) => Effect.provide(forgetRepo(id), context),
			list: Effect.provide(listRepos, context),
			register: (registration) =>
				registrationGate.withPermits(1)(
					Effect.provide(registerRepo(registration), context),
				),
		};
	}),
);
