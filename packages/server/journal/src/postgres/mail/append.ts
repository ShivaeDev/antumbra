import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { MessageId } from "@antumbra/platform-vocabulary/mail.ts";
import type { MailEvent } from "@antumbra/platform-vocabulary/mail-event.ts";
import { Effect } from "effect";
import type { History } from "#postgres/mail/initialize.ts";

export const append = (history: History) =>
	Effect.fn("MailHistory.append")(function* (requestId: Request, event: typeof MailEvent.Type) {
		const events = yield* history.read("mail");
		return yield* history
			.append({ stream: "mail", requestId, expectedVersion: events.at(-1)?.streamVersion ?? 0, events: [event] })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});

export const read = (history: History) =>
	Effect.fn("MailHistory.read")(function* (id: MessageId) {
		return (yield* history.read("mail")).filter((event) =>
			event.value._tag === "MessageSent" ? event.value.id === id : event.value._tag !== "MailWakeObserved" && event.value.ids.includes(id),
		);
	});

export const rebuild = (history: History) =>
	Effect.fn("MailHistory.rebuild")(function* () {
		yield* history.rebuild;
	});

export const checkRequest = (history: History) =>
	Effect.fn("MailHistory.checkRequest")(function* (requestId: Request) {
		const earlier = (yield* history.read("mail")).find((event) => event.requestId === requestId);
		if (earlier !== undefined) return yield* Effect.fail(new AlreadyDone({ requestId, seq: earlier.streamVersion }));
	});
