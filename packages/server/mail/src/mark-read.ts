import { markRead as command } from "@antumbra/domain-mail/commands/mark-read.ts";
import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { Clock, Effect, type Semaphore } from "effect";
import { addressed } from "#addressed.ts";

export const markRead = (serial: Semaphore.Semaphore) =>
	Effect.fn("Mail.markRead")(function* (input: typeof command.Input.Type) {
		const history = yield* MailHistory;
		yield* history.checkRequest(input.requestId);
		const scanned = yield* addressed(input.agentId, input.ids);
		if (scanned._tag === "Stray") return yield* command.reject.NotAddressed({ id: scanned.id });
		const at = yield* Clock.currentTimeMillis;
		return yield* history.append(input.requestId, {
			_tag: "MessageRead",
			readAt: new Date(at).toISOString(),
			ids: scanned.held.filter((row) => row.readAt === null).map((row) => row.id),
		});
	}, serial.withPermit);
