import type { CommandInput } from "@antumbra/platform-feature/command.ts";
import { feature } from "@antumbra/platform-feature/feature.ts";
import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Api } from "@antumbra/platform-rpc/client.ts";
import { Effect } from "effect";
import { park } from "#example/commands/park.ts";
import { pieceParked } from "#example/facts/piece-parked.ts";
import type { pieces } from "#example/feature.ts";
import { PieceId } from "#example/ids.ts";
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

type Refused = Effect.Error<ReturnType<Api<readonly [typeof pieces]>["pieces"]["park"]>>;

export const declaredRejectionReachesTheCaller: Refused = new park.Rejection.PieceNotLaunched({
	pieceId: PieceId.make("piece-1"),
	status: "chartered",
});

// @ts-expect-error a repeated request resolves to the sequence number it already produced, so AlreadyDone never reaches the caller.
export const alreadyDoneNeverReachesTheCaller: Refused = new AlreadyDone({ requestId: "request-1", seq: 1 });
