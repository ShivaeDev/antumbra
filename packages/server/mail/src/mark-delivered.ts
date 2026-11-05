import { markDelivered as command } from "@antumbra/domain-mail/commands/mark-delivered.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { MailHistory } from "@antumbra/server-storage/mail/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
import { addressed } from "#addressed.ts";

export const markDelivered = (serial: Semaphore.Semaphore) =>
	Effect.fn("Mail.markDelivered")(
		function* (input: typeof command.Input.Type) {
			const history = yield* MailHistory;
			yield* history.checkRequest(input.requestId);
			const scanned = yield* addressed(input.agentId, input.ids);
			if (scanned._tag === "Stray") return yield* command.reject.NotAddressed({ id: scanned.id });
			const at = yield* Clock.currentTimeMillis;
			return yield* history.append(input.requestId, {
				_tag: "MessageDelivered",
				deliveredAt: new Date(at).toISOString(),
				ids: scanned.held.filter((row) => row.deliveredAt === null).map((row) => row.id),
			});
		},
		serial.withPermit,
		withExecutionWrite,
	);
