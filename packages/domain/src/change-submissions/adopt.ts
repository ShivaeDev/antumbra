import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { ChangeHostUnavailable } from "@antumbra/plugin-api";
import { Clock, Effect, Option, PubSub } from "effect";
import { activeChange, linkProduces } from "#change-submissions/links.ts";
import type { AdoptChangeInput } from "#change-submissions/model.ts";
import type { ObservationAttachment } from "#change-submissions/observation-match.ts";
import { reconcileObservation } from "#change-submissions/observation-projection.ts";
import { submissionKey } from "#change-submissions/prepared-row.ts";
import { claimingHost, repoNamed } from "#change-submissions/repository.ts";
import { proposedChange } from "#change-write.ts";
import {
	ensureAgentResourcesUnclaimed,
	ensureBranchResourcesUnclaimed,
} from "#resource-reclaim-guard.ts";

const adoptionAttachment = (agentId: string | null, repoId: string) =>
	Effect.gen(function* () {
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

export const adoptSubmittedChange = (input: AdoptChangeInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const pieces = yield* Pieces;
		const writer = yield* Writer;
		yield* pieces.verifyExists(input.pieceId);
		const repo = yield* repoNamed(input.repoName);
		if (input.agentId !== null) {
			yield* writer.write(ensureAgentResourcesUnclaimed(input.agentId));
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
		const adopted = yield* writer.write(
			Effect.gen(function* () {
				if (input.agentId !== null) {
					yield* ensureAgentResourcesUnclaimed(input.agentId);
				}
				yield* ensureBranchResourcesUnclaimed(repo.source, observation.headRef);
				const attachment = yield* adoptionAttachment(input.agentId, repo.id);
				const reconciled = yield* reconcileObservation(
					host.tag,
					observation,
					now,
					attachment,
				);
				const row = Option.match(reconciled, {
					onNone: () =>
						proposedChange({
							body: "",
							host: host.tag,
							now,
							observation,
							openedByAgentId: input.agentId,
							repoId: repo.id,
						}),
					onSome: (result) => result.row,
				});
				if (Option.isNone(reconciled)) {
					yield* db.Change.create(row);
				}
				const linked = yield* linkProduces(input.pieceId, row.id);
				return {
					changed:
						linked ||
						Option.isNone(reconciled) ||
						(Option.isSome(reconciled) && reconciled.value.changed),
					row,
				};
			}),
		);
		if (adopted.changed) {
			yield* PubSub.publish(feeds.voyages, undefined);
		}
		yield* PubSub.publish(feeds.changeRefresh, undefined);
		return adopted.row;
	});
