import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { piece } from "@antumbra/domain-pieces/rows/piece.ts";
import { RepoId } from "@antumbra/domain-repos/ids.ts";
import { repo } from "@antumbra/domain-repos/rows/repo.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect, Schema } from "effect";
import { adoptionRequest } from "#rows/adoption-request.ts";
export const adoptionRequested = fact("ChangeAdoptionRequested", adoptionRequest.fields);
export const requestAdoption = command("requestAdoption", {
	input: { pieceId: PieceId, repoId: RepoId, url: titled(Schema.String, { title: "Pull request URL" }) },
	reads: [piece, repo],
	emits: adoptionRequested,
	rejections: { UnknownPiece: { id: Schema.String }, UnknownRepo: { id: Schema.String } },
	run: Effect.fn("changes.requestAdoption")(function* (input, rows, reject) {
		if (!(yield* rows.piece.exists(input.pieceId))) return yield* reject.UnknownPiece({ id: input.pieceId });
		if (!(yield* rows.repo.exists(input.repoId))) return yield* reject.UnknownRepo({ id: input.repoId });
		return { error: null, id: input.requestId, pieceId: input.pieceId, repoId: input.repoId, url: input.url };
	}),
});
export const adoptionRequestedMaterializer = materializer(adoptionRequested, {
	writes: [adoptionRequest],
	run: Effect.fn("changes.adoptionRequested")(function* (fact, rows) {
		yield* rows.changeAdoptionRequest.insert(fact);
	}),
});
