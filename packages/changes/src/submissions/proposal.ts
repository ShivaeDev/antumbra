import { Database } from "@antumbra/persistence";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Clock, Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";
import { PreparedChangeInvalid } from "#submissions/errors.ts";
import type { Proposal } from "#submissions/model.ts";

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

const ensureOwnerAvailable = (row: ChangeRow) => (row.openedByAgentId === null ? Effect.void : ensureAgentCanOwnLocalWork(row.openedByAgentId));

export const freezeProposal = (changeId: string, defaultRef: string, proposal: Proposal) =>
	Effect.gen(function* () {
		const db = yield* Database;
		const now = yield* Clock.currentTimeMillis;
		const row = yield* requireStoredChange(changeId);
		yield* ensureOwnerAvailable(row);
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
		yield* db.Change.where({ id: changeId }).update({
			baseRef: frozen.baseRef,
			body: frozen.body,
			draftAt: frozen.draftAt,
			proposalFrozenAt: frozen.proposalFrozenAt,
			title: frozen.title,
		});
		return frozen;
	});
