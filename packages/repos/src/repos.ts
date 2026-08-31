import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { defineService } from "@antumbra/service-definition";
import { type Context, Effect } from "effect";
import { forgetRepo } from "#forget.ts";
import { registerRepo } from "#register.ts";

export const Repos = defineService({
	id: "@antumbra/repos/Repos",
	initialize: Effect.void,
	methods: () => ({
		forget: forgetRepo,
		register: registerRepo,
	}),
	requires: [Database, DomainFeeds],
});

export type RepoRegistry = Context.Service.Shape<typeof Repos>;

export const ReposLive = Repos.layer;
