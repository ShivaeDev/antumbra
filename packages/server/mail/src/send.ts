import { send as command } from "@antumbra/domain-mail/commands/send.ts";
import { send as commandDecision } from "@antumbra/server-mail/logic/commands/send.ts";
import { withExecutionWrite } from "@antumbra/server-storage/execution/boundary.ts";
import { MailHistory } from "@antumbra/server-storage/mail/service.ts";
import { Effect, type Semaphore } from "effect";

export const send = (serial: Semaphore.Semaphore) =>
	Effect.fn("Mail.send")(
		function* (input: typeof command.Input.Type) {
			const history = yield* MailHistory;
			yield* history.checkRequest(input.requestId);
			const event = yield* commandDecision(input, command.reject);
			return yield* history.append(input.requestId, { _tag: "MessageSent", ...event });
		},
		serial.withPermit,
		withExecutionWrite,
	);
