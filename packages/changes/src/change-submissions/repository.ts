import { Database } from "@antumbra/persistence";
import type { ChangeHost, ChangeHostRepo } from "@antumbra/plugin-api";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Effect, Option } from "effect";
import type { RepoBerth } from "#change-submissions/model.ts";
import { ChangeHostRegistry } from "#change-submissions/registries.ts";
import { BerthNotFound, NoChangeHost, RepoNotFound } from "#errors.ts";

export const claimingHost = (repo: ChangeHostRepo): Effect.Effect<ChangeHost, NoChangeHost, ChangeHostRegistry> =>
	Effect.gen(function* () {
		const hosts = yield* ChangeHostRegistry;
		const host = [...hosts.values()].find((candidate) => candidate.supports(repo));
		return host === undefined ? yield* new NoChangeHost({ repoName: repo.name }) : host;
	});

export const repoNamed = (repoName: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const found = yield* db.Repo.where({ name: repoName }).first();
		return yield* Option.match(found, {
			onNone: () => new RepoNotFound({ repoName }),
			onSome: (repo) =>
				Effect.succeed({
					defaultRef: repo.defaultRef,
					id: repo.id,
					name: repo.name,
					source: repo.source,
				}),
		});
	});

export const berthFor = (agentId: string, repo: ChangeHostRepo) =>
	Effect.gen(function* () {
		const db = yield* Database;
		yield* ensureAgentCanOwnLocalWork(agentId);
		const berths = yield* db.Berth.where({ agentId }).all();
		const berth = berths.find((candidate) => candidate.source === repo.source);
		return berth === undefined
			? yield* new BerthNotFound({ agentId, repoName: repo.name })
			: ({
					agentId,
					branch: berth.branch,
					id: berth.id,
					path: berth.path,
					runner: berth.runner,
					slug: berth.slug,
					source: berth.source,
				} satisfies RepoBerth);
	});
