import { progress as query4 } from "@antumbra/domain-pieces/queries/progress.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { progress as read4 } from "@antumbra/server-pieces/logic/queries/progress.ts";
import { Effect, Schema } from "effect";
import type { NativeRead } from "#readings/types.ts";
export const readings: ReadonlyMap<QueryShape, NativeRead> = new Map<QueryShape, NativeRead>([
	[
		query4,
		(input) =>
			Schema.decodeUnknownEffect(Schema.Struct(query4.input))(input).pipe(
				Effect.flatMap((given) => read4(given)),
				Effect.orDie,
			),
	],
]);
