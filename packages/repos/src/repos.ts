import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Context, Effect, Layer } from "effect";
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
		const context = Context.make(Database, db).pipe(
			Context.add(DomainFeeds, feeds),
		);
		return {
			forget: (id) => Effect.provide(forgetRepo(id), context),
			list: Effect.provide(listRepos, context),
			register: (registration) =>
				Effect.provide(registerRepo(registration), context),
		};
	}),
);
