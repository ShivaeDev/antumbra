import { all as query0 } from "@antumbra/domain-repos/queries/all.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { all as read0 } from "@antumbra/server-repos/logic/queries/all.ts";
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
