import { send as command } from "@antumbra/domain-mail/commands/send.ts";
import { MailHistory } from "@antumbra/server-journal/postgres/mail/service.ts";
import { Effect, type Semaphore } from "effect";

export const send = (serial: Semaphore.Semaphore) =>
	Effect.fn("Mail.send")(function* (input: typeof command.Input.Type) {
		const history = yield* MailHistory;
		yield* history.checkRequest(input.requestId);
		const event = yield* command.run(input, {}, command.reject);
		return yield* history.append(input.requestId, { _tag: "MessageSent", ...event });
	}, serial.withPermit);
