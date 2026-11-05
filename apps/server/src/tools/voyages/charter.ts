import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Effect } from "effect";
import { notice } from "#tools/voyages/pace.ts";
import { charterVoyagePieceSpec } from "#tools/voyages/specs.ts";

export const charterVoyagePiece = bind(charterVoyagePieceSpec, (context, input) =>
	answered(
		context,
		charterVoyagePieceSpec.name,
		Effect.gen(function* () {
			const piecesService = yield* Pieces;

			const voyageId = VoyageId.make(input.voyageId);
			const notes = yield* notice(voyageId);
			const request = requestId(context);
			yield* piecesService
				.charter({ ...input, voyageId, dependsOn: [], requestId: request })
				.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
			return [`chartered ${PieceId.make(request)} on voyage ${voyageId}`, ...notes].join("\n");
		}),
		(text) => text,
	),
);
