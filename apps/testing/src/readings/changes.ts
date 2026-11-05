import { browse as query2 } from "@antumbra/domain-changes/queries/browse.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { browse as read2 } from "@antumbra/server-changes/logic/queries/browse.ts";
import { Effect, Schema } from "effect";
import type { NativeRead } from "#readings/types.ts";
export const readings: ReadonlyMap<QueryShape, NativeRead> = new Map<QueryShape, NativeRead>([
	[
		query2,
		(input) =>
			Schema.decodeUnknownEffect(Schema.Struct(query2.input))(input).pipe(
				Effect.flatMap((given) => read2(given)),
				Effect.orDie,
			),
	],
]);
