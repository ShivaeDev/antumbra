import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { all as pieces } from "@antumbra/domain-pieces/queries/all.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { all as repos } from "@antumbra/domain-repos/queries/all.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { choice, titled } from "@antumbra/platform-feature/edit.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const adoptionRequested = fact("ChangeAdoptionRequested", adoptionRequest.fields);
export const requestAdoption = command("requestAdoption", {
	input: {
		pieceId: titled(choice(pieces, { label: "title", value: "id", input: {} }), { title: "Piece" }),
		repoId: titled(choice(repos, { label: "name", value: "id", input: {} }), { title: "Repository" }),
		url: titled(Schema.String, { title: "Pull request URL" }),
	},
	reads: [piece, repo],
	emits: adoptionRequested,
	rejections: { UnknownPiece: { id: Schema.String }, UnknownRepo: { id: Schema.String } },
	run: Effect.fn("changes.requestAdoption")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(PieceId.make(input.pieceId)))) return yield* reject.UnknownPiece({ id: input.pieceId });
		if (!(yield* rows.repo.exists(RepoId.make(input.repoId)))) return yield* reject.UnknownRepo({ id: input.repoId });
		return { error: null, id: input.requestId, pieceId: PieceId.make(input.pieceId), repoId: RepoId.make(input.repoId), url: input.url };
	}),
});
export const adoptionRequestedMaterializer = materializer(adoptionRequested, {
	writes: [adoptionRequest],
	run: Effect.fn("changes.adoptionRequested")(function* (fact, rows) {
		yield* rows.changeAdoptionRequest.insert(fact);
	}),
});
