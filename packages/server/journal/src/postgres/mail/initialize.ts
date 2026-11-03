import { MailEvent } from "@antumbra/platform-vocabulary/mail-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { apply, reset } from "#postgres/mail/projection.ts";

export const initialize = Effect.fn("MailHistory.initialize")(function* () {
	return yield* makeEventStore({ name: "mail", schema: MailEvent, version: 1, projections: [{ name: "mail", apply, reset }] });
})();
export type History = Effect.Success<typeof initialize>;
