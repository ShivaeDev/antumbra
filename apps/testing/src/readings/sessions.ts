import { pending as query7 } from "@antumbra/domain-sessions/queries/pending.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { pending as read7 } from "@antumbra/server-sessions/logic/queries/pending.ts";
import { Effect, Schema } from "effect";
import type { NativeRead } from "#readings/types.ts";
export const readings: ReadonlyMap<QueryShape, NativeRead> = new Map<QueryShape, NativeRead>([
	[
		query7,
		(input) =>
			Schema.decodeUnknownEffect(Schema.Struct(query7.input))(input).pipe(
				Effect.flatMap((given) => read7(given)),
				Effect.orDie,
			),
	],
]);
