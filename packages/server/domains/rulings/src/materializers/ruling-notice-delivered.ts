import { materializer } from "@antumbra/platform-feature/materializer.ts";
import { Effect } from "effect";
import { rulingNoticeDelivered } from "#facts/ruling-notice-delivered.ts";
import { rulingNoticeReceipt } from "#rows/notice-receipt.ts";
export const rulingNoticeDeliveredMaterializer = materializer(rulingNoticeDelivered, {
	writes: [rulingNoticeReceipt],
	run: Effect.fn("rulings.noticeDelivered")(function* (fact, rows) {
		if (!(yield* rows.rulingNoticeReceipt.exists(fact.id)))
			yield* rows.rulingNoticeReceipt.insert({ id: fact.id, rulingId: fact.rulingId, deliveredAt: new Date(fact.at).toISOString() });
	}),
});
