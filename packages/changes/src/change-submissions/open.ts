import { DomainFeeds } from "@antumbra/domain-feeds";
import { ChangeHostUnavailable } from "@antumbra/plugin-api";
import { Effect } from "effect";
import type { ChangeRow } from "#change-rows.ts";
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

const retainsClaimOrSettles = (
	row: ChangeRow,
	submissionKey: string,
): boolean =>
	row.stage === "open"
		? row.submissionKey === submissionKey
		: (row.stage === "landed" || row.stage === "withdrawn") &&
			row.submissionKey === null;

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
		if (snapshot.stage !== "prepared" || snapshot.externalId !== null) {
			return snapshot;
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
		const branch = snapshot.preparedHeadRef;
		const headSha = snapshot.preparedHeadSha;
		const path = snapshot.worktreePath;
		const submissionKey = snapshot.submissionKey;
		if (
			branch === null ||
			headSha === null ||
			path === null ||
			submissionKey === null
		) {
			return yield* new PreparedChangeInvalid({
				changeId: snapshot.id,
				detail:
					"local branch, head, worktree, or submission claim evidence is missing",
			});
		}
		const observation = yield* host.open({
			base: snapshot.baseRef,
			berth: { branch, path },
			body: snapshot.body,
			draft: snapshot.draftAt !== null,
			headSha,
			repo: prepared.repo,
			submissionId: snapshot.id,
			title: snapshot.title,
		});
		const attached = yield* applyObservations(host.tag, [observation], {
			_tag: "Claimed",
			agentId: input.agentId,
			changeId: snapshot.id,
			submissionKey,
		});
		const row = attached[0];
		if (
			row === undefined ||
			row.id !== snapshot.id ||
			!retainsClaimOrSettles(row, submissionKey)
		) {
			return yield* new ChangeObservationConflict({
				changeId: snapshot.id,
				externalId: observation.externalId,
				host: host.tag,
			});
		}
		yield* feeds.publishChangeRefresh();
		return row;
	});
