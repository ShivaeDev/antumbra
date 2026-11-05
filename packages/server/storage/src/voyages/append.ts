import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { VoyageEvent, VoyageId } from "@antumbra/platform-vocabulary/voyage.ts";
import { Effect } from "effect";
import type { History } from "#voyages/initialize.ts";

export const append = (history: History) =>
	Effect.fn("VoyageHistory.append")(function* (requestId: Request, event: typeof VoyageEvent.Type) {
		const events = yield* history.read("voyages");
		return yield* history
			.append({ stream: "voyages", requestId, expectedVersion: events.at(-1)?.streamVersion ?? 0, events: [event] })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});

export const read = (history: History) =>
	Effect.fn("VoyageHistory.read")(function* (id: VoyageId) {
		return (yield* history.read("voyages")).filter((event) => event.value.id === id);
	});

export const rebuild = (history: History) =>
	Effect.fn("VoyageHistory.rebuild")(function* () {
		yield* history.rebuild;
	});
