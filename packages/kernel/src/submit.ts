import { Database } from "@antumbra/persistence";
import { Effect, Stream } from "effect";
import { UnregisteredIntentTag } from "#errors.ts";
import type { IntentKind } from "#intent.ts";
import { changesFor } from "#intent-changes.ts";
import { SchedulerState } from "#state.ts";
import { announce } from "#transitions.ts";

export const submitIntent = Effect.fn("Kernel.submit")(function* <Payload>(kind: IntentKind<Payload>, payload: NoInfer<Payload>) {
	const state = yield* SchedulerState;
	if (state.kinds.get(kind.tag) !== kind) {
		return yield* new UnregisteredIntentTag({ tag: kind.tag });
	}
	const encoded = yield* kind.encode(payload);
	const id = yield* state.nextId;
	const db = yield* Database;
	yield* db.Intent.create({ detail: null, id, payload: encoded, status: "queued", tag: kind.tag });
	yield* announce({ id, status: "queued" });
	return {
		changes: changesFor(id).pipe(Stream.provideService(Database, db), Stream.provideService(SchedulerState, state)),
		id,
	};
});
