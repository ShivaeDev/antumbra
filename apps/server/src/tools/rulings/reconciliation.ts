import { delivery, type RulingDelivery } from "@antumbra/domain-rulings/queries/delivery.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Mail } from "@antumbra/server-mail/service.ts";
import { Rulings } from "@antumbra/server-rulings/service.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Effect } from "effect";
import { watchKeys } from "#supervision/keys.ts";
import { replayed } from "#tools/rulings/runtime.ts";

const deliver = Effect.fn("rulings.deliver")(function* (notice: RulingDelivery) {
	const mailService = yield* Mail;
	const rulingsService = yield* Rulings;

	yield* replayed(
		mailService.send({
			requestId: Id.Request.make(notice.requestId),
			toAgentId: notice.toAgentId,
			authorAgentId: null,
			precedence: "priority",
			body: notice.body,
		}),
	);
	if (notice.kind === "answer")
		yield* replayed(rulingsService.markDelivered({ requestId: Id.Request.make(`ruling-delivered:${notice.rulingId}`), rulingId: notice.rulingId }));
	if (notice.kind === "notice")
		yield* replayed(
			rulingsService.acknowledgeNotice({
				requestId: Id.Request.make(`ruling-notice-delivered:${notice.requestId}`),
				rulingId: notice.rulingId,
				id: notice.requestId,
			}),
		);
});
export const rulingReconciliation = run({
	keys: watchKeys(delivery.reads, delivery.scope?.({})),
	read: Rulings.use((service) => service.delivery({})).pipe(Effect.orDie),
	act: (notices) => Effect.forEach(notices, (notice) => deliver(notice).pipe(Effect.orDie), { discard: true }),
});
