import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { type Context, Effect } from "effect";
import { reposByIds } from "#by-ids.ts";
import { forgetRepo } from "#forget.ts";
import { registerRepo } from "#register.ts";
import { registeredRepos } from "#registered.ts";

export const Repos = defineService({
	id: "@antumbra/repos/Repos",
	initialize: Effect.void,
	methods: () => ({
		byIds: reposByIds,
		forget: forgetRepo,
		register: registerRepo,
		registered: registeredRepos,
	}),
	requires: [Database, DomainFeeds],
});

export type RepoRegistry = Context.Service.Shape<typeof Repos>;

export const ReposLive = Repos.layer;
