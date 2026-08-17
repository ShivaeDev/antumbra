import { DomainFeeds } from "@antumbra/domain-feeds";
import { ChangeHostUnavailable } from "@antumbra/plugin-api";
import { Effect, PubSub } from "effect";
import {
	ChangeObservationConflict,
	PreparedChangeInvalid,
} from "#change-submissions/errors.ts";
import type { OpenChangeInput } from "#change-submissions/model.ts";
import { applyObservations } from "#change-submissions/observations.ts";
import { prepareChange } from "#change-submissions/prepare.ts";
import { ChangeHostRegistry } from "#change-submissions/registries.ts";
import { UnknownChangeHostTag } from "#errors.ts";

export const openSubmittedChange = (input: OpenChangeInput) =>
	Effect.gen(function* () {
		const feeds = yield* DomainFeeds;
		const hosts = yield* ChangeHostRegistry;
		const prepared = yield* prepareChange(input, input);
		if (prepared.row.externalId !== null) {
			return prepared.row;
		}
		const host = hosts.get(prepared.hostTag);
		if (host === undefined) {
			return yield* new UnknownChangeHostTag({ tag: prepared.hostTag });
		}
		const capability = yield* host.capability;
		if (!capability.available) {
			return yield* new ChangeHostUnavailable({
				detail: capability.detail,
				host: host.tag,
			});
		}
		const branch = prepared.row.preparedHeadRef;
		const headSha = prepared.row.preparedHeadSha;
		const path = prepared.row.worktreePath;
		if (branch === null || headSha === null || path === null) {
			return yield* new PreparedChangeInvalid({
				changeId: prepared.row.id,
				detail: "local branch, head, or worktree evidence is missing",
			});
		}
		const observation = yield* host.open({
			base: input.base,
			berth: { branch, path },
			body: input.body,
			draft: input.draft,
			headSha,
			repo: prepared.repo,
			title: input.title,
		});
		const attached = yield* applyObservations(host.tag, [observation]);
		const row = attached.find((candidate) => candidate.id === prepared.row.id);
		if (row === undefined) {
			return yield* new ChangeObservationConflict({
				changeId: prepared.row.id,
				externalId: observation.externalId,
				host: host.tag,
			});
		}
		yield* PubSub.publish(feeds.changeRefresh, undefined);
		return row;
	});
