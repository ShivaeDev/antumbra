import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { PieceId } from "@antumbra/platform-vocabulary/piece.ts";
import type { PieceEvent } from "@antumbra/platform-vocabulary/piece-event.ts";
import { Effect } from "effect";
import type { History } from "#postgres/pieces/initialize.ts";

export const append = (history: History) =>
	Effect.fn("PieceHistory.append")(function* (requestId: Request, event: typeof PieceEvent.Type) {
		const events = yield* history.read("pieces");
		return yield* history
			.append({ stream: "pieces", requestId, expectedVersion: events.at(-1)?.streamVersion ?? 0, events: [event] })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});

export const read = (history: History) =>
	Effect.fn("PieceHistory.read")(function* (id: PieceId) {
		return (yield* history.read("pieces")).filter((event) => event.value.id === id);
	});

export const rebuild = (history: History) =>
	Effect.fn("PieceHistory.rebuild")(function* () {
		yield* history.rebuild;
	});

export const checkRequest = (history: History) =>
	Effect.fn("PieceHistory.checkRequest")(function* (requestId: Request) {
		const earlier = (yield* history.read("pieces")).find((event) => event.requestId === requestId);
		if (earlier !== undefined) return yield* Effect.fail(new AlreadyDone({ requestId, seq: earlier.streamVersion }));
	});
