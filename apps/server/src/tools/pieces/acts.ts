import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Pieces } from "@antumbra/server-pieces/service.ts";
import { Effect } from "effect";
import { onMembers } from "#tools/pieces/reach.ts";
import { launchPieceSpec, parkPieceSpec, unparkPieceSpec } from "#tools/pieces/specs.ts";
import { pace, paceWords } from "#tools/voyages/pace.ts";

export const launchPiece = bind(launchPieceSpec, (context, input) =>
	onMembers(context, [input.pieceId], false, (voyageId) =>
		answered(
			context,
			launchPieceSpec.name,
			Effect.gen(function* () {
				const piecesService = yield* Pieces;

				yield* piecesService
					.launch({ id: PieceId.make(input.pieceId), requestId: requestId(context) })
					.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
				return yield* pace(voyageId);
			}),
			(current) => ["launched into the pool", paceWords(current)].join("\n"),
		),
	),
);

export const parkPiece = bind(parkPieceSpec, (context, input) =>
	onMembers(context, [input.pieceId], false, () =>
		answered(
			context,
			parkPieceSpec.name,
			Effect.gen(function* () {
				const piecesService = yield* Pieces;

				return yield* piecesService
					.park({ id: PieceId.make(input.pieceId), requestId: requestId(context) })
					.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
			}),
			() => "parked",
		),
	),
);

export const unparkPiece = bind(unparkPieceSpec, (context, input) =>
	onMembers(context, [input.pieceId], false, () =>
		answered(
			context,
			unparkPieceSpec.name,
			Effect.gen(function* () {
				const piecesService = yield* Pieces;

				return yield* piecesService
					.unpark({ id: PieceId.make(input.pieceId), requestId: requestId(context) })
					.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.succeed(done.seq)));
			}),
			() => "unparked",
		),
	),
);
