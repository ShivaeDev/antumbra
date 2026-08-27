import { Database } from "@antumbra/persistence";
import { ensureAgentResourcesUnclaimed } from "@antumbra/resource-reclamation";
import { Clock, Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import { PreparedChangeInvalid } from "#change-submissions/errors.ts";
import type { Proposal } from "#change-submissions/model.ts";

const requireStoredChange = (id: string) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const stored = yield* db.Change.where({ id }).first();
		return yield* Option.match(stored, {
			onNone: () =>
				new PreparedChangeInvalid({
					changeId: id,
					detail: "the durable prepared row is missing",
				}),
			onSome: changeRow,
		});
	});

export const freezeProposal = (
	changeId: string,
	defaultRef: string,
	proposal: Proposal,
) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const now = yield* Clock.currentTimeMillis;
		return yield* Effect.gen(function* () {
			const row = yield* requireStoredChange(changeId);
			if (row.openedByAgentId !== null) {
				yield* ensureAgentResourcesUnclaimed(row.openedByAgentId);
			}
			if (row.proposalFrozenAt !== null) {
				return row;
			}
			const frozen = {
				...row,
				baseRef: proposal.base ?? defaultRef,
				body: proposal.body,
				draftAt: proposal.draft ? new Date(now) : null,
				proposalFrozenAt: new Date(now),
				title: proposal.title,
			};
			const updated = yield* db.Change.where({
				id: row.id,
				proposalFrozenAt: null,
			}).update({
				baseRef: frozen.baseRef,
				body: frozen.body,
				draftAt: frozen.draftAt,
				proposalFrozenAt: frozen.proposalFrozenAt,
				title: frozen.title,
			});
			return updated === null ? yield* requireStoredChange(changeId) : frozen;
		});
	});
