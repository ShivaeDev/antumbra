import { DomainFeeds } from "@antumbra/domain-feeds";
import { Database, Writer } from "@antumbra/persistence";
import { Pieces } from "@antumbra/pieces";
import { ChangeHostUnavailable } from "@antumbra/plugin-api";
import { Clock, Effect, Option, PubSub } from "effect";
import { linkProduces } from "#change-submissions/links.ts";
import type { AdoptChangeInput } from "#change-submissions/model.ts";
import { reconcileObservation } from "#change-submissions/observation-projection.ts";
import { claimingHost, repoNamed } from "#change-submissions/repository.ts";
import { proposedChange } from "#change-write.ts";

export const adoptSubmittedChange = (input: AdoptChangeInput) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const feeds = yield* DomainFeeds;
		const pieces = yield* Pieces;
		const writer = yield* Writer;
		yield* pieces.require(input.pieceId);
		const repo = yield* repoNamed(input.repoName);
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
				const reconciled = yield* reconcileObservation(
					host.tag,
					observation,
					now,
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
