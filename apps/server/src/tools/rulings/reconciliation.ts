import { send } from "@antumbra/domain-mail/commands/send.ts";
import { acknowledgeNotice } from "@antumbra/domain-rulings/commands/acknowledge-notice.ts";
import { markDelivered } from "@antumbra/domain-rulings/commands/mark-delivered.ts";
import { delivery, type RulingDelivery } from "@antumbra/domain-rulings/queries/delivery.ts";
import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { Commit } from "@antumbra/server-journal/commit.ts";
import { Live } from "@antumbra/server-journal/live.ts";
import { run } from "@shivaedev/reconciler/run.ts";
import { Effect } from "effect";
import { watchKeys } from "#supervision/keys.ts";
import { replayed } from "#tools/rulings/runtime.ts";

const deliver = Effect.fn("rulings.deliver")(function* (notice: RulingDelivery) {
	const commit = yield* Commit;
	yield* replayed(
		commit.commit(send, {
			requestId: Id.Request.make(notice.requestId),
			toAgentId: notice.toAgentId,
			authorAgentId: null,
			precedence: "priority",
			body: notice.body,
		}),
	);
	if (notice.kind === "answer")
		yield* replayed(commit.commit(markDelivered, { requestId: Id.Request.make(`ruling-delivered:${notice.rulingId}`), rulingId: notice.rulingId }));
	if (notice.kind === "notice")
		yield* replayed(
			commit.commit(acknowledgeNotice, {
				requestId: Id.Request.make(`ruling-notice-delivered:${notice.requestId}`),
				rulingId: notice.rulingId,
				id: notice.requestId,
			}),
		);
});
export const rulingReconciliation = run({
	keys: watchKeys(delivery.reads, delivery.scope?.({})),
	read: Live.use((live) => live.read(delivery, {})),
	act: (notices) => Effect.forEach(notices, (notice) => deliver(notice).pipe(Effect.orDie), { discard: true }),
});
