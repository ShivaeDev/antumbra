import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { onVoyage, refused } from "@antumbra/platform-tool-schemas/answers.ts";
import type { ToolContext } from "@antumbra/platform-tool-schemas/context.ts";
import type { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Effect } from "effect";

export const onMembers = <Requirements>(
	context: ToolContext,
	ids: readonly string[],
	dependencies: boolean,
	act: (voyageId: VoyageId) => Effect.Effect<ToolAnswer, never, Requirements>,
) =>
	onVoyage(context, (named) =>
		Effect.gen(function* () {
			const piecesService = yield* Pieces;

			const voyageId = VoyageId.make(named);
			const strangers = yield* piecesService.reach({ voyageId, pieceIds: ids }).pipe(Effect.orDie);
			if (strangers.length > 0)
				return refused(dependencies ? `these pieces are not on your voyage: ${strangers.join(", ")}` : "that piece is not on your voyage");
			return yield* act(voyageId);
		}),
	);
