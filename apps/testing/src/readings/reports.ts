import { byPiece as query1 } from "@antumbra/domain-reports/queries/by-piece.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { byPiece as read1 } from "@antumbra/server-reports/logic/queries/by-piece.ts";
import { Effect, Schema } from "effect";
import type { NativeRead } from "#readings/types.ts";
export const readings: ReadonlyMap<QueryShape, NativeRead> = new Map<QueryShape, NativeRead>([
	[
		query1,
		(input) =>
			Schema.decodeUnknownEffect(Schema.Struct(query1.input))(input).pipe(
				Effect.flatMap((given) => read1(given)),
				Effect.orDie,
			),
	],
]);
