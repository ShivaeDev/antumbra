import type { CommandInput } from "@antumbra/feature/command.ts";
import { feature } from "@antumbra/feature/feature.ts";
import type { ReadHandles } from "@antumbra/feature/handles.ts";
import { Effect } from "effect";
import type { park } from "#example/commands/park.ts";
import { pieceParked } from "#example/facts/piece-parked.ts";
import { piece } from "#example/rows/piece.ts";

export const writingInsideACommand = Effect.fn("example.writing")(function* (
	input: CommandInput<typeof park.input>,
	rows: ReadHandles<typeof park.reads>,
) {
	// @ts-expect-error a command reads rows and never writes them, so the write is not on its handle.
	yield* rows.piece.update(input.pieceId, { parkedReason: input.reason, status: "parked" });
});

export const unmaterialized = feature("unmaterialized", {
	rows: [piece],
	// @ts-expect-error every fact a feature declares needs exactly one materializer in the same feature.
	facts: [pieceParked],
	commands: [],
	materializers: [],
	queries: [],
});
