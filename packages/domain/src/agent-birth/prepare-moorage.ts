import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { MooragePlan, Runner } from "@antumbra/plugin-api";
import { Repos, repoSlug } from "@antumbra/repos";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { decodeStoredBerthStatus, decodeStoredMoorageStatus } from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { MooragePlanConflict } from "#errors.ts";
import type { SpawnFields } from "#spawn-fields.ts";

export const prepareMoorage = Effect.fn("AgentBirth.prepareMoorage")(function* (payload: SpawnFields, runner: Runner) {
	const db = yield* Database;
	const registry = yield* Repos;
	const feeds = yield* DomainFeeds;
	yield* ensureAgentCanOwnLocalWork(payload.agentId);
	const row = yield* db.Moorage.where({ agentId: payload.agentId }).first();
	if (Option.isSome(row)) {
		if (row.value.runner !== payload.runner) {
			return yield* new MooragePlanConflict({
				agentId: payload.agentId,
				detail: `stored runner ${row.value.runner} does not match ${payload.runner}`,
			});
		}
		yield* Effect.fromResult(decodeStoredMoorageStatus(row.value.agentId, row.value.status));
		const berths = yield* db.Berth.where({ agentId: payload.agentId })
			.orderBy((berth) => berth.createdAt.asc())
			.all();
		yield* Effect.forEach(berths, (berth) => Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)));
		return {
			berths: berths.map((berth) => ({
				branch: berth.branch,
				path: berth.path,
				ref: berth.ref,
				slug: berth.slug,
				source: berth.source,
			})),
			root: row.value.root,
		} satisfies MooragePlan;
	}
	const repos = yield* registry.registered();
	const plan = runner.plan({
		agentId: payload.agentId,
		repos: repos.map((repo) => ({
			ref: repo.defaultRef,
			slug: repoSlug(repo.source),
			source: repo.source,
		})),
	});
	yield* ensureAgentCanOwnLocalWork(payload.agentId);
	yield* db.Moorage.create({
		agentId: payload.agentId,
		reclaimState: null,
		root: plan.root,
		runner: payload.runner,
		status: "provisioning",
	});
	yield* Effect.forEach(plan.berths, (berth) =>
		db.Berth.create({
			agentId: payload.agentId,
			branch: berth.branch,
			id: `${payload.agentId}:${berth.slug}`,
			path: berth.path,
			reclaimState: null,
			ref: berth.ref,
			runner: payload.runner,
			slug: berth.slug,
			source: berth.source,
			status: "provisioning",
			strandedAt: null,
		}),
	);
	yield* feeds.publishFleetRefresh();
	return plan;
});
