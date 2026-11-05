import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Effect } from "effect";
import { onMembers } from "#tools/pieces/reach.ts";
import { rewirePieceSpec } from "#tools/pieces/specs.ts";

export const rewirePiece = bind(rewirePieceSpec, (context, input) =>
	onMembers(context, [input.pieceId], false, () =>
		onMembers(context, input.dependsOn, true, () =>
			answered(
				context,
				rewirePieceSpec.name,
				Effect.gen(function* () {
					const piecesService = yield* Pieces;

					return yield* piecesService
						.rewire({ id: PieceId.make(input.pieceId), dependsOn: input.dependsOn, requestId: requestId(context) })
						.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
				}),
				() => "rewired",
			),
		),
	),
);
