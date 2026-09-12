import { reach } from "@antumbra/domain-pieces/queries/reach.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { onVoyage, refused } from "@antumbra/platform-tool-schemas/answers.ts";
import type { ToolContext } from "@antumbra/platform-tool-schemas/context.ts";
import type { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { Effect } from "effect";

export const onMembers = <Requirements>(
	context: ToolContext,
	ids: readonly string[],
	dependencies: boolean,
	act: (voyageId: VoyageId) => Effect.Effect<ToolAnswer, never, Requirements>,
) =>
	onVoyage(context, (named) =>
		Effect.gen(function* () {
			const live = yield* Live;
			const voyageId = VoyageId.make(named);
			const strangers = yield* live.read(reach, { voyageId, pieceIds: ids });
			if (strangers.length > 0)
				return refused(dependencies ? `these pieces are not on your voyage: ${strangers.join(", ")}` : "that piece is not on your voyage");
			return yield* act(voyageId);
		}),
	);
