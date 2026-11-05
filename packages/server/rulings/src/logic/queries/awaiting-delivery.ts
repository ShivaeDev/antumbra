import type * as Source from "@antumbra/domain-rulings/queries/awaiting-delivery.ts";
import { selection as rulingSelection } from "@antumbra/server-storage/records/ruling.ts";
import { Records } from "@antumbra/server-storage/records.ts";
import { Effect, type Schema } from "effect";
export const awaitingDelivery = Effect.fn("rulings.awaitingDelivery")(function* (
	_input: Schema.Struct.Type<typeof Source.awaitingDelivery.input>,
): Effect.fn.Return<typeof Source.awaitingDelivery.output.Type, never, Records> {
	const rows = yield* Records;

	const all = yield* rows.ruling
		.findMany({ where: {}, orderBy: { field: "storage_order", direction: "asc" }, select: rulingSelection })
		.pipe(Effect.orDie);
	return all.filter((ruling) => ruling.answer !== null && ruling.deliveredAt === null && ruling.requester.kind === "agent");
});
