import type * as Source from "@antumbra/domain-rulings/queries/awaiting-ascent.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const awaitingAscent = Effect.fn("rulings.awaitingAscent")(function* (
	_input: Schema.Struct.Type<typeof Source.awaitingAscent.input>,
): Effect.fn.Return<typeof Source.awaitingAscent.output.Type, never, Records> {
	const rows = yield* Records;

	const all = yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	return all.filter((ruling) => ruling.answer === null && ruling.requester.kind === "agent" && ruling.rung !== "admiral");
});
