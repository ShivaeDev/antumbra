import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, type WriteExecutors, Writer } from "@antumbra/persistence";
import type { MooragePlan, Runner } from "@antumbra/plugin-api";
import {
	decodeStoredBerthStatus,
	decodeStoredMoorageStatus,
} from "@antumbra/vocabulary/agent-runtime";
import { Effect, Option, PubSub } from "effect";
import { MooragePlanConflict } from "#errors.ts";
import { ensureAgentResourcesUnclaimed } from "#resource-reclaim-guard.ts";
import type { SpawnFields } from "#spawn.ts";

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
	const writer = yield* Writer;
	const feeds = yield* DomainFeeds;
	const executors = yield* Effect.context<WriteExecutors>();
	const provide = <A, E>(effect: Effect.Effect<A, E, WriteExecutors>) =>
		Effect.provideContext(effect, executors);
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
			const stored = yield* provide(writer.write(loadPlan(payload)));
			if (Option.isSome(stored)) {
				return stored.value;
			}
			const repos = yield* provide(
				db.Repo.orderBy((repo) => repo.createdAt.asc()).all(),
			);
			const plan = runner.plan({
				agentId: payload.agentId,
				repos: repos.map((repo) => ({
					ref: repo.defaultRef,
					source: repo.source,
				})),
			});
			yield* provide(
				writer.write(
					ensureUnclaimed(payload.agentId).pipe(
						Effect.andThen(persistPlan(payload, plan)),
					),
				),
			);
			yield* PubSub.publish(feeds.fleet, undefined);
			return plan;
		});
});
