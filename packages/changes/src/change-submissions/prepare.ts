import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import type { ChangeHostRepo } from "@antumbra/plugin-api";
import { UnknownRunnerError } from "@antumbra/plugin-api";
import { ensureAgentCanOwnLocalWork, ensureBerthResourcesUnclaimed } from "@antumbra/resource-reclamation";
import { Clock, Effect, Option, Result } from "effect";
import { activeChange, linkProduces } from "#change-submissions/links.ts";
import type { Proposal, SubmitChangeInput } from "#change-submissions/model.ts";
import { preparedChange, submissionKey } from "#change-submissions/prepared-row.ts";
import { RunnerRegistry } from "#change-submissions/registries.ts";
import { berthFor, claimingHost, repoNamed } from "#change-submissions/repository.ts";

interface PreparedSubmission {
	readonly hostTag: string;
	readonly repo: ChangeHostRepo;
	readonly row: ReturnType<typeof preparedChange>;
}

export const prepareChange = (input: SubmitChangeInput, proposal?: Proposal) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const pieces = yield* Pieces;
		const runners = yield* RunnerRegistry;
		yield* pieces.verifyExists(input.pieceId);
		const repo = yield* repoNamed(input.repoName);
		const key = submissionKey(input.agentId, repo.id);
		const linked = yield* Effect.gen(function* () {
			yield* ensureAgentCanOwnLocalWork(input.agentId);
			const existing = yield* activeChange(key);
			if (Option.isNone(existing)) {
				return Option.none<{
					readonly linked: boolean;
					readonly row: ReturnType<typeof preparedChange>;
				}>();
			}
			return Option.some({
				linked: yield* linkProduces(input.pieceId, existing.value.id),
				row: existing.value,
			});
		});
		if (Option.isSome(linked)) {
			if (linked.value.linked) {
				yield* feeds.publishVoyageRefresh();
			}
			return {
				hostTag: linked.value.row.host,
				repo,
				row: linked.value.row,
			} satisfies PreparedSubmission;
		}
		const host = yield* claimingHost(repo);
		const berth = yield* berthFor(input.agentId, repo);
		const runner = runners.get(berth.runner);
		if (runner === undefined) {
			return yield* new UnknownRunnerError({ tag: berth.runner });
		}
		const evidence = yield* runner.captureChange(berth);
		const candidate = preparedChange(input, repo, host.tag, evidence, yield* Clock.currentTimeMillis, proposal);
		const stored = yield* Effect.gen(function* () {
			yield* ensureAgentCanOwnLocalWork(input.agentId);
			yield* ensureBerthResourcesUnclaimed(berth.id);
			const raced = yield* activeChange(key);
			let row: ReturnType<typeof preparedChange>;
			let created = false;
			if (Option.isSome(raced)) {
				row = raced.value;
			} else {
				const inserted = yield* Effect.result(db.Change.create(candidate));
				if (Result.isSuccess(inserted)) {
					row = candidate;
					created = true;
				} else {
					const winner = yield* activeChange(key);
					if (Option.isNone(winner)) {
						return yield* inserted.failure;
					}
					row = winner.value;
				}
			}
			const linked = yield* linkProduces(input.pieceId, row.id);
			return { changed: created || linked, row };
		});
		if (stored.changed) {
			yield* feeds.publishVoyageRefresh();
		}
		return {
			hostTag: stored.row.host,
			repo,
			row: stored.row,
		} satisfies PreparedSubmission;
	});
