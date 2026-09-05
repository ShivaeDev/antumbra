import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { ChangeHostUnavailable } from "@antumbra/plugin-api";
import { ensureAgentCanOwnLocalWork, ensureBranchResourcesUnclaimed } from "@antumbra/resource-reclamation";
import { Clock, Effect, Option } from "effect";
import { activeChange, linkProduces } from "#change-submissions/links.ts";
import type { AdoptChangeInput } from "#change-submissions/model.ts";
import type { ObservationAttachment } from "#change-submissions/observation-match.ts";
import { reconcileObservation } from "#change-submissions/observation-projection.ts";
import { submissionKey } from "#change-submissions/prepared-row.ts";
import { claimingHost, repoNamed } from "#change-submissions/repository.ts";
import { proposedChange } from "#change-write.ts";

const adoptionAttachment = Effect.fnUntraced(function* (agentId: string | null, repoId: string) {
	if (agentId === null) {
		return { _tag: "ExternalOnly" } satisfies ObservationAttachment;
	}
	const key = submissionKey(agentId, repoId);
	const active = yield* activeChange(key);
	return Option.match(active, {
		onNone: () => ({ _tag: "ExternalOnly" }) as const,
		onSome: (row) =>
			({
				_tag: "Claimed",
				agentId,
				changeId: row.id,
				submissionKey: key,
			}) as const,
	}) satisfies ObservationAttachment;
});

export const adoptSubmittedChange = Effect.fn("Changes.adopt")(function* (input: AdoptChangeInput) {
	const db = yield* Database;
	const feeds = yield* DomainFeeds;
	const pieces = yield* Pieces;
	yield* pieces.verifyExists(input.pieceId);
	const repo = yield* repoNamed(input.repoName);
	if (input.agentId !== null) {
		yield* ensureAgentCanOwnLocalWork(input.agentId);
	}
	const host = yield* claimingHost(repo);
	const capability = yield* host.capability;
	if (!capability.available) {
		return yield* new ChangeHostUnavailable({
			detail: capability.detail,
			host: host.tag,
		});
	}
	const observation = yield* host.adopt(input.url, repo);
	const now = yield* Clock.currentTimeMillis;
	yield* ensureBranchResourcesUnclaimed(repo.source, observation.headRef);
	const attachment = yield* adoptionAttachment(input.agentId, repo.id);
	const reconciled = yield* reconcileObservation(host.tag, observation, now, attachment);
	const adopted = Option.match(reconciled, {
		onNone: () =>
			({
				changed: true,
				row: proposedChange({
					body: "",
					host: host.tag,
					now,
					observation,
					openedByAgentId: input.agentId,
					originSessionId: null,
					repoId: repo.id,
				}),
			}) as const,
		onSome: (result) => result,
	});
	if (Option.isNone(reconciled)) {
		yield* db.Change.create(adopted.row);
	}
	const linked = yield* linkProduces(input.pieceId, adopted.row.id);
	if (linked || adopted.changed) {
		yield* feeds.publishVoyageRefresh();
	}
	yield* feeds.publishChangeRefresh();
	return adopted.row;
});
