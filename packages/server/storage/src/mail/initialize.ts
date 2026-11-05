import { MailEvent } from "@antumbra/platform-vocabulary/mail-event.ts";
import { makeEventStore } from "@shivaedev/events/makeEventStore.ts";
import { Effect } from "effect";
import { ExecutionDefinition } from "#execution/definition.ts";
import { apply, reset } from "#mail/projection.ts";
import { Records } from "#records.ts";

export const initialize = Effect.fn("MailHistory.initialize")(function* () {
	const derived = (yield* ExecutionDefinition).refresh.pipe(Effect.provideService(Records, yield* Records));
	return yield* makeEventStore({
		name: "mail",
		schema: MailEvent,
		version: 1,
		projections: [{ name: "mail", apply: (event) => apply(event).pipe(Effect.andThen(derived)), reset }],
	});
})();
export type History = Effect.Success<typeof initialize>;
