import { all as pieces } from "@antumbra/domain-pieces/queries/all.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { all as repos } from "@antumbra/domain-repos/queries/all.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { choice, titled } from "@antumbra/platform-feature/edit.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeAdoptionRequestedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { Schema } from "effect";
export const adoptionRequested = fact("ChangeAdoptionRequested", ChangeAdoptionRequestedPayload.fields);
export const requestAdoption = command("requestAdoption", {
	input: {
		pieceId: titled(choice(pieces, { label: "title", value: "id", input: {} }), { title: "Piece" }),
		repoId: titled(choice(repos, { label: "name", value: "id", input: {} }), { title: "Repository" }),
		url: titled(Schema.String, { title: "Pull request URL" }),
	},
	reads: [piece, repo],
	emits: adoptionRequested,
	rejections: { UnknownPiece: { id: Schema.String }, UnknownRepo: { id: Schema.String } },
});
