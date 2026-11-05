import { smoothingState as query8 } from "@antumbra/domain-boards/queries/smoothing-state.ts";
import type { QueryShape } from "@antumbra/platform-feature/query.ts";
import { smoothingState as read8 } from "@antumbra/server-boards/logic/queries/smoothing-state.ts";
import { Effect, Schema } from "effect";
import type { NativeRead } from "#readings/types.ts";
export const readings: ReadonlyMap<QueryShape, NativeRead> = new Map<QueryShape, NativeRead>([
	[
		query8,
		(input) =>
			Schema.decodeUnknownEffect(Schema.Struct(query8.input))(input).pipe(
				Effect.flatMap((given) => read8(given)),
				Effect.orDie,
			),
	],
]);
