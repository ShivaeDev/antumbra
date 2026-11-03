import { Effect, Layer } from "effect";
import { MailContract } from "#contract.ts";
import { Mail } from "#service.ts";

export const handlers = MailContract.application.toLayer(
	Effect.gen(function* () {
		const mail = yield* Mail;
		return MailContract.application.of({
			"mail.send": (input) => mail.send(input).pipe(Effect.catchIf((error) => error._tag !== "Blank" && error._tag !== "AlreadyDone", Effect.die)),
			"mail.markDelivered": (input) =>
				mail.markDelivered(input).pipe(Effect.catchIf((error) => error._tag !== "NotAddressed" && error._tag !== "AlreadyDone", Effect.die)),
			"mail.markRead": (input) =>
				mail.markRead(input).pipe(Effect.catchIf((error) => error._tag !== "NotAddressed" && error._tag !== "AlreadyDone", Effect.die)),
			"mail.mailbox": (input) => mail.mailbox(input).pipe(Effect.orDie),
			"mail.unread": (input) => mail.unread(input).pipe(Effect.orDie),
			"mail.dueWakes": () => mail.dueWakes().pipe(Effect.orDie),
		});
	}),
);
export const mail = handlers.pipe(Layer.provideMerge(Mail.layer));
