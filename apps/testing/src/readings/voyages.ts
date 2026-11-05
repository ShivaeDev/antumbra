import { progress as query0 } from "@antumbra/domain-voyages/queries/progress.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { progress as read0 } from "@antumbra/server-voyages/logic/queries/progress.ts";
import { Effect, Schema } from "effect";
import type { NativeRead } from "#readings/types.ts";
export const readings: ReadonlyMap<QueryShape, NativeRead> = new Map<QueryShape, NativeRead>([
	[
		query0,
		(input) =>
			Schema.decodeUnknownEffect(Schema.Struct(query0.input))(input).pipe(
				Effect.flatMap((given) => read0(given)),
				Effect.orDie,
			),
	],
]);
