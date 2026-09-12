import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
export const adoptionRequest = row(
	"changeAdoptionRequest",
	{ id: Schema.String, pieceId: PieceId, repoId: RepoId, url: Schema.String },
	{ key: "id" },
);
