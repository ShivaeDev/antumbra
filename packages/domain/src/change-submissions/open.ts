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
import { freezeProposal } from "#change-submissions/proposal.ts";
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
		const snapshot = yield* freezeProposal(
			prepared.row.id,
			prepared.repo.defaultRef,
			input,
		);
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
		const branch = snapshot.preparedHeadRef;
		const headSha = snapshot.preparedHeadSha;
		const path = snapshot.worktreePath;
		if (branch === null || headSha === null || path === null) {
			return yield* new PreparedChangeInvalid({
				changeId: snapshot.id,
				detail: "local branch, head, or worktree evidence is missing",
			});
		}
		const observation = yield* host.open({
			base: snapshot.baseRef,
			berth: { branch, path },
			body: snapshot.body,
			draft: snapshot.draftAt !== null,
			headSha,
			repo: prepared.repo,
			title: snapshot.title,
		});
		const attached = yield* applyObservations(host.tag, [observation]);
		const row = attached[0];
		if (row === undefined) {
			return yield* new ChangeObservationConflict({
				changeId: snapshot.id,
				externalId: observation.externalId,
				host: host.tag,
			});
		}
		yield* PubSub.publish(feeds.changeRefresh, undefined);
		return row;
	});
