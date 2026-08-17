import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import { Context, Effect, Layer } from "effect";
import { forgetRepo } from "#forget.ts";
import { listRepos } from "#list.ts";
import type { RepoRegistry } from "#model.ts";
import { registerRepo } from "#register.ts";

export class Repos extends Context.Service<Repos, RepoRegistry>()(
	"@antumbra/repos/Repos",
) {}

export type ReposService = Context.Service.Shape<typeof Repos>;

export const ReposLive = Layer.effect(Repos)(
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		const feeds = yield* DomainFeeds;
		const executors = yield* Effect.context<WriteExecutors>();
		const context = Context.merge(
			executors,
			Context.make(Database, db).pipe(
				Context.add(Writer, writer),
				Context.add(DomainFeeds, feeds),
			),
		);
		return {
			forget: (id) => Effect.provide(forgetRepo(id), context),
			list: Effect.provide(listRepos, context),
			register: (registration) =>
				Effect.provide(registerRepo(registration), context),
		};
	}),
);
