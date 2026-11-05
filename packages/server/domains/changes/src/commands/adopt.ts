import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Observation } from "@antumbra/platform-vocabulary/change-host.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Schema } from "effect";
import { claimRows } from "#commands/claims.ts";
import { changeAdopted } from "#facts/change-adopted.ts";
import { change } from "#rows/change.ts";
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
});
