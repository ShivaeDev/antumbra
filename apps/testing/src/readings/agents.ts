import { pendingOperations as query18 } from "@antumbra/domain-agents/queries/pending-operations.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { pendingOperations as read18 } from "@antumbra/server-agents/logic/queries/pending-operations.ts";
import { Effect, Schema } from "effect";
import type { NativeRead } from "#readings/types.ts";
export const readings: ReadonlyMap<QueryShape, NativeRead> = new Map<QueryShape, NativeRead>([
	[
		query18,
		(input) =>
			Schema.decodeUnknownEffect(Schema.Struct(query18.input))(input).pipe(
				Effect.flatMap((given) => read18(given)),
				Effect.orDie,
			),
	],
]);
