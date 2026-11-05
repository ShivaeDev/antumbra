import type { rulingNoticeDelivered } from "@antumbra/domain-rulings/facts/ruling-notice-delivered.ts";
import type { FactValue } from "@antumbra/platform-feature/fact.ts";
import { Effect } from "effect";
import { Records } from "#records.ts";
export const rulingNoticeDeliveredMaterializer = Effect.fn("rulings.noticeDelivered")(function* (
	fact: FactValue<typeof rulingNoticeDelivered>,
): Effect.fn.Return<void, never, Records> {
	const rows = yield* Records;

	if (
		!(yield* rows.rulingNoticeReceipt.count({ where: { id: fact.id } }).pipe(
			Effect.map((count) => count > 0),
			Effect.orDie,
		))
	)
		yield* rows.rulingNoticeReceipt
			.insertVoid({ id: fact.id, rulingId: fact.rulingId, deliveredAt: new Date(fact.at).toISOString() })
			.pipe(Effect.orDie);
});
