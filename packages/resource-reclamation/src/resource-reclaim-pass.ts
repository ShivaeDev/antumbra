import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import type { BerthSite } from "@antumbra/plugin-api";
import {
	decodeStoredResourceReclaimState,
	type ResourceReclaimState,
} from "@antumbra/vocabulary/agent-runtime";
import { Clock, Effect, PubSub } from "effect";
import {
	type ClaimedBerth,
	claimReclaimableBerths,
} from "#resource-reclaim-claims.ts";
import { ResourceReclaimRunners } from "#resource-reclaim-runners.ts";

const site = (berth: ClaimedBerth): BerthSite => ({
	branch: berth.branch,
	path: berth.path,
	slug: berth.slug,
	source: berth.source,
});

const finishReclaim = (berth: ClaimedBerth) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			Effect.gen(function* () {
				yield* db.Berth.where({ id: berth.id }).update({
					reclaimState: null,
					status: "reclaimed",
					strandedAt: null,
				});
				const siblings = yield* db.Berth.where({
					agentId: berth.agentId,
				}).all();
				const states = yield* Effect.forEach(siblings, (sibling) =>
					Effect.fromResult(
						decodeStoredResourceReclaimState(
							"Berth",
							sibling.id,
							sibling.reclaimState,
						),
					),
				);
				if (!states.includes("claimed" satisfies ResourceReclaimState)) {
					yield* db.Moorage.where({ agentId: berth.agentId }).update({
						reclaimState: null,
					});
				}
			}),
		);
	});

const markDirty = (berth: ClaimedBerth, now: number) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const writer = yield* Writer;
		yield* writer.write(
			db.Berth.where({ id: berth.id }).update({
				status: "stranded",
				strandedAt: berth.strandedAt ?? new Date(now),
			}),
		);
	});

const runClaim = (berth: ClaimedBerth, now: number) =>
	Effect.gen(function* () {
		const runners = yield* ResourceReclaimRunners;
		const runner = runners.get(berth.runner);
		if (runner === undefined) {
			return yield* Effect.logWarning("resource reclaim remains claimed", {
				berthId: berth.id,
				failure: `runner ${berth.runner} is unavailable`,
			});
		}
		yield* runner.reclaim(site(berth)).pipe(
			Effect.flatMap((verdict) =>
				verdict._tag === "reclaimed"
					? finishReclaim(berth)
					: markDirty(berth, now),
			),
			Effect.catchCause((cause) =>
				Effect.logWarning("resource reclaim remains claimed", {
					berthId: berth.id,
					failure: String(cause),
				}),
			),
		);
	});

export const runResourceReclaimPass = Effect.gen(function* () {
	const feeds = yield* DomainFeeds;
	const runners = yield* ResourceReclaimRunners;
	const claims = yield* claimReclaimableBerths(new Set(runners.keys()));
	const now = yield* Clock.currentTimeMillis;
	if (claims.length > 0) {
		yield* PubSub.publish(feeds.fleet, undefined);
	}
	yield* Effect.forEach(claims, (berth) => runClaim(berth, now), {
		concurrency: 1,
		discard: true,
	});
	if (claims.length > 0) {
		yield* PubSub.publish(feeds.fleet, undefined);
		yield* Effect.logInfo("resource reclaim pass finished", {
			claims: claims.length,
		});
	}
});
