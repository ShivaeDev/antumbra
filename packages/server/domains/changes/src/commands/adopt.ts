import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { Observation } from "@antumbra/platform-change-host/schema.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Effect, Schema } from "effect";
import { claimed, claimRows, ownerAvailable } from "#claims.ts";
import { submissionKey } from "#commands/prepare.ts";
import { changeAdopted } from "#facts/change-adopted.ts";
import { ChangeId, pieceChangeId } from "#ids.ts";
import { type Attachment, projectObservation, selectObservation } from "#observation.ts";
import { observeRow } from "#observe-row.ts";
import { type ChangeRow, change } from "#rows/change.ts";
import { changeTransition } from "#rows/change-transition.ts";
export const adopt = command("adopt", {
	input: {
		adoptionId: Schema.optionalKey(Schema.String),
		pieceId: PieceId,
		repoId: RepoId,
		agentId: Schema.NullOr(Schema.String),
		host: Schema.String,
		observation: Observation,
		observedAt: Schema.String,
	},
	reads: [piece, repo, change, changeTransition, ...claimRows],
	emits: changeAdopted,
	rejections: {
		ResourceOwnerUnavailable: { agentId: Schema.String },
		UnknownPiece: { id: Schema.String },
		UnknownRepo: { id: Schema.String },
		ChangeIdentityCollision: { externalId: Schema.String },
		ChangeObservationConflict: { externalId: Schema.String },
		ResourceClaimed: { source: Schema.String },
	},
	run: Effect.fn("changes.adopt")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.pieceId))) return yield* reject.UnknownPiece({ id: input.pieceId });
		if (!(yield* rows.repo.exists(input.repoId))) return yield* reject.UnknownRepo({ id: input.repoId });
		if (input.agentId !== null && !(yield* ownerAvailable(rows, input.agentId)))
			return yield* reject.ResourceOwnerUnavailable({ agentId: input.agentId });
		const repository = yield* rows.repo.get(input.repoId);
		const seen = input.observation;
		if (seen.repoId !== input.repoId) return yield* reject.ChangeObservationConflict({ externalId: seen.externalId });
		if (yield* claimed(rows, input.agentId, repository.source, seen.headRef)) return yield* reject.ResourceClaimed({ source: repository.source });
		const all = yield* rows.change.where({});
		const key = input.agentId === null ? null : submissionKey(input.agentId, input.repoId);
		const active = key === null ? undefined : all.find((row) => row.submissionKey === key);
		const attachment: Attachment =
			active === undefined || input.agentId === null || key === null
				? { _tag: "ExternalOnly" }
				: { _tag: "Claimed", changeId: active.id, agentId: input.agentId, submissionKey: key };
		const selected = selectObservation(all, input.host, seen, attachment);
		if (selected._tag === "Collision") return yield* reject.ChangeIdentityCollision({ externalId: seen.externalId });
		if (selected._tag === "Conflict") return yield* reject.ChangeObservationConflict({ externalId: seen.externalId });
		const now = input.observedAt;
		const candidate: ChangeRow = {
			id: ChangeId.make(input.requestId),
			repoId: input.repoId,
			host: input.host,
			title: "",
			body: "",
			headRef: seen.headRef,
			baseRef: seen.baseRef,
			headSha: null,
			preparedHeadRef: null,
			preparedHeadSha: null,
			publicationRequestId: null,
			publicationError: null,
			proposalFrozenAt: null,
			worktreePath: null,
			workingDiff: null,
			workingTreeStatus: null,
			submissionKey: null,
			stage: "prepared",
			draftAt: null,
			url: null,
			externalId: null,
			checks: "none",
			review: "none",
			mergeable: "unknown",
			openedByAgentId: input.agentId,
			originSessionId: null,
			raw: null,
			activityAt: now,
			observedAt: now,
			landedAt: null,
			withdrawnAt: null,
			createdAt: now,
		};
		const observed =
			selected.row === undefined
				? { change: projectObservation(candidate, seen, now), transition: null }
				: yield* observeRow(selected.row, seen, now, rows);
		const held = observed.change ?? selected.row ?? candidate;
		return {
			adoptionId: input.adoptionId ?? null,
			change: held,
			transition: observed.transition,
			link: { id: pieceChangeId(input.pieceId, held.id), pieceId: input.pieceId, changeId: held.id, purpose: "produces" as const },
		};
	}),
});
