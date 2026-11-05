import type * as Source from "@antumbra/domain-changes/commands/request-adoption.ts";
import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import type { RejectedBy } from "@antumbra/platform-feature/rejection.ts";
import { ChangeAdoptionRequestedPayload } from "@antumbra/platform-vocabulary/changes-event.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect } from "effect";
export const adoptionRequested = fact("ChangeAdoptionRequested", ChangeAdoptionRequestedPayload.fields);
export const requestAdoption = Effect.fn("changes.requestAdoption")(function* (
	input: typeof Source.requestAdoption.Input.Type,
	reject: typeof Source.requestAdoption.reject,
): Effect.fn.Return<typeof Source.requestAdoption.emits.Payload.Type, RejectedBy<typeof Source.requestAdoption.rejections>, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.piece.count({ where: { id: PieceId.make(input.pieceId) } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownPiece({ id: input.pieceId });
	if (
		!(yield* rows.repo.count({ where: { id: RepoId.make(input.repoId) } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		return yield* reject.UnknownRepo({ id: input.repoId });
	return { error: null, id: input.requestId, pieceId: PieceId.make(input.pieceId), repoId: RepoId.make(input.repoId), url: input.url };
});
