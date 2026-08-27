import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import type { MooragePlan, Runner } from "@antumbra/plugin-api";
import { repoSlug } from "@antumbra/repos";
import { ensureAgentResourcesUnclaimed } from "@antumbra/resource-reclamation";
import {
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option } from "effect";
import { MooragePlanConflict } from "#errors.ts";
import type { SpawnFields } from "#spawn-fields.ts";

interface StoredBerthPlan {
	readonly branch: string;
	readonly path: string;
	readonly ref: string;
	readonly slug: string;
	readonly source: string;
}

const planFromRows = (
	root: string,
	berths: ReadonlyArray<StoredBerthPlan>,
): MooragePlan => ({
	berths: berths.map((berth) => ({
		branch: berth.branch,
		path: berth.path,
		ref: berth.ref,
		slug: berth.slug,
		source: berth.source,
	})),
	root,
});

export const makePrepareMoorage = Effect.gen(function* () {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const ensureUnclaimed = (agentId: string) =>
		ensureAgentResourcesUnclaimed(agentId).pipe(
			Effect.provideService(Database, db),
		);
	const loadPlan = (payload: SpawnFields) =>
		Effect.gen(function* () {
			yield* ensureUnclaimed(payload.agentId);
			const row = yield* db.Moorage.where({ agentId: payload.agentId }).first();
			if (Option.isNone(row)) {
				return Option.none<MooragePlan>();
			}
			if (row.value.runner !== payload.runner) {
				return yield* new MooragePlanConflict({
					agentId: payload.agentId,
					detail: `stored runner ${row.value.runner} does not match ${payload.runner}`,
				});
			}
			yield* Effect.fromResult(
				decodeStoredMoorageStatus(row.value.agentId, row.value.status),
			);
			const berths = yield* db.Berth.where({ agentId: payload.agentId })
				.orderBy((berth) => berth.createdAt.asc())
				.all();
			yield* Effect.forEach(berths, (berth) =>
				Effect.fromResult(decodeStoredBerthStatus(berth.id, berth.status)),
			);
			return Option.some(planFromRows(row.value.root, berths));
		});
	const persistPlan = (payload: SpawnFields, plan: MooragePlan) =>
		db.Moorage.create({
			agentId: payload.agentId,
			reclaimState: null,
			root: plan.root,
			runner: payload.runner,
			status: "provisioning",
		}).pipe(
			Effect.andThen(
				Effect.forEach(plan.berths, (berth) =>
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
				),
			),
		);
	return (payload: SpawnFields, runner: Runner) =>
		Effect.gen(function* () {
			const stored = yield* loadPlan(payload);
			if (Option.isSome(stored)) {
				return stored.value;
			}
			const repos = yield* db.Repo.orderBy((repo) =>
				repo.createdAt.asc(),
			).all();
			const plan = runner.plan({
				agentId: payload.agentId,
				repos: repos.map((repo) => ({
					ref: repo.defaultRef,
					slug: repoSlug(repo.source),
					source: repo.source,
				})),
			});
			yield* db.transaction(
				Effect.gen(function* () {
					yield* Database;
					yield* ensureUnclaimed(payload.agentId);
					yield* persistPlan(payload, plan);
				}),
			);
			yield* feeds.publishFleetRefresh();
			return plan;
		});
});
