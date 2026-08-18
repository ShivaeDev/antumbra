import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import type { ChangeHostRepo } from "@antumbra/plugin-api";
import { UnknownRunnerError } from "@antumbra/plugin-api";
import {
	ensureAgentResourcesUnclaimed,
	ensureBerthResourcesUnclaimed,
} from "@antumbra/resource-reclamation";
import { Clock, Effect, Option, PubSub } from "effect";
import { activeChange, linkProduces } from "#change-submissions/links.ts";
import type { Proposal, SubmitChangeInput } from "#change-submissions/model.ts";
import {
	preparedChange,
	submissionKey,
} from "#change-submissions/prepared-row.ts";
import { RunnerRegistry } from "#change-submissions/registries.ts";
import {
	berthFor,
	claimingHost,
	repoNamed,
} from "#change-submissions/repository.ts";

export interface PreparedSubmission {
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
		const writer = yield* Writer;
		yield* pieces.verifyExists(input.pieceId);
		const repo = yield* repoNamed(input.repoName);
		const key = submissionKey(input.agentId, repo.id);
		const linked = yield* writer.write(
			Effect.gen(function* () {
				yield* ensureAgentResourcesUnclaimed(input.agentId);
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
			}),
		);
		if (Option.isSome(linked)) {
			if (linked.value.linked) {
				yield* PubSub.publish(feeds.voyages, undefined);
			}
			return {
				hostTag: linked.value.row.host,
				repo,
				row: linked.value.row,
			} satisfies PreparedSubmission;
		}
		const host = yield* claimingHost(repo);
		const berth = yield* writer.write(berthFor(input.agentId, repo));
		const runner = runners.get(berth.runner);
		if (runner === undefined) {
			return yield* new UnknownRunnerError({ tag: berth.runner });
		}
		const evidence = yield* runner.captureChange(berth);
		const candidate = preparedChange(
			input,
			repo,
			host.tag,
			evidence,
			yield* Clock.currentTimeMillis,
			proposal,
		);
		const stored = yield* writer.write(
			Effect.gen(function* () {
				yield* ensureBerthResourcesUnclaimed(berth.id);
				const raced = yield* activeChange(key);
				const row = Option.getOrElse(raced, () => candidate);
				let created = false;
				if (Option.isNone(raced)) {
					yield* db.Change.create(row);
					created = true;
				}
				const linked = yield* linkProduces(input.pieceId, row.id);
				return { changed: created || linked, row };
			}),
		);
		if (stored.changed) {
			yield* PubSub.publish(feeds.voyages, undefined);
		}
		return {
			hostTag: stored.row.host,
			repo,
			row: stored.row,
		} satisfies PreparedSubmission;
	});
