import { Database } from "@antumbra/persistence";
import type { ChangeHost, ChangeHostRepo } from "@antumbra/plugin-api";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Effect, Option } from "effect";
import { BerthNotFound, NoChangeHost, RepoNotFound } from "#errors.ts";
import { ChangeHostRegistry } from "#registries.ts";

export const claimingHost = Effect.fnUntraced(function* (repo: ChangeHostRepo): Effect.fn.Return<ChangeHost, NoChangeHost, ChangeHostRegistry> {
	const hosts = yield* ChangeHostRegistry;
	const host = [...hosts.values()].find((candidate) => candidate.supports(repo));
	return host === undefined ? yield* new NoChangeHost({ repoName: repo.name }) : host;
});

export const repoNamed = Effect.fnUntraced(function* (repoName: string) {
	const db = yield* Database;
	const found = yield* db.Repo.where({ name: repoName }).first();
	return yield* Option.match(found, {
		onNone: () => new RepoNotFound({ repoName }),
		onSome: Effect.succeed,
	});
});

export const berthFor = Effect.fnUntraced(function* (agentId: string, repo: ChangeHostRepo) {
	const db = yield* Database;
	yield* ensureAgentCanOwnLocalWork(agentId);
	const berth = yield* db.Berth.where({ agentId, source: repo.source }).first();
	return yield* Option.match(berth, {
		onNone: () => new BerthNotFound({ agentId, repoName: repo.name }),
		onSome: Effect.succeed,
	});
});
