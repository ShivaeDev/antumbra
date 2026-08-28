import { Database, type PrismaError } from "@antumbra/persistence";
import { ensureAgentCanOwnLocalWork } from "@antumbra/resource-reclamation";
import { Clock, Effect, Option } from "effect";
import { changeRow } from "#change-read.ts";
import type { ChangeRow } from "#change-rows.ts";
import { PreparedChangeInvalid } from "#change-submissions/errors.ts";
import type { Proposal } from "#change-submissions/model.ts";

const transientConnection = (failure: PrismaError): boolean =>
	failure.reason._tag === "PrismaConnectionFailure" &&
	failure.reason.transient === true;

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

const ensureOwnerAvailable = (row: ChangeRow) =>
	row.openedByAgentId === null
		? Effect.void
		: ensureAgentCanOwnLocalWork(row.openedByAgentId);

const storeFrozenProposal = (current: ChangeRow, frozen: ChangeRow) =>
	Effect.gen(function* () {
		const db = yield* Database;
		return yield* db.Change.where({
			id: current.id,
			proposalFrozenAt: null,
			stage: "prepared",
		})
			.update({
				baseRef: frozen.baseRef,
				body: frozen.body,
				draftAt: frozen.draftAt,
				proposalFrozenAt: frozen.proposalFrozenAt,
				title: frozen.title,
			})
			.pipe(
				Effect.catchTag("PrismaError", (failure) =>
					transientConnection(failure)
						? Effect.yieldNow.pipe(Effect.as(null))
						: Effect.fail(failure),
				),
			);
	});

const canRetryFreeze = (row: ChangeRow): boolean =>
	row.stage === "prepared" && row.proposalFrozenAt === null;

export const freezeProposal = (
	changeId: string,
	defaultRef: string,
	proposal: Proposal,
) =>
	Effect.gen(function* () {
		const now = yield* Clock.currentTimeMillis;
		while (true) {
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
			const updated = yield* storeFrozenProposal(row, frozen);
			if (updated !== null) {
				return frozen;
			}
			const winner = yield* requireStoredChange(changeId);
			if (!canRetryFreeze(winner)) {
				return winner;
			}
			yield* Effect.yieldNow;
		}
	});
