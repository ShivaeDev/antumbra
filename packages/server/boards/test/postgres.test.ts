import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";
import { noting, opening, reefBoard } from "#test/kit.ts";

postgresApp.it(
	"keeps board reads quiet until commit and discards a rolled-back note",
	[],
	function* ({ api, boardsHistory, transaction, rollback, published, clearPublished }) {
		yield* api["voyages.open"](opening);
		yield* clearPublished();
		const ready = yield* Deferred.make<void>();
		const release = yield* Deferred.make<void>();
		const event = {
			_tag: "NoteWritten" as const,
			id: noting("pending", "pending").requestId,
			board: reefBoard,
			number: 1,
			register: "rough" as const,
			authorAgentId: null,
			body: "pending",
			at: 0,
		};
		const pending = yield* transaction(
			Effect.gen(function* () {
				yield* boardsHistory.append(Request.make("pending"), [{ ...event, id: BoardEntryId.make(event.id) }]);
				yield* Deferred.succeed(ready, undefined);
				yield* Deferred.await(release);
			}),
		).pipe(Effect.forkScoped);
		yield* Deferred.await(ready);
		expect(yield* answered(api["boards.entries"]({ board: reefBoard }), "boards.entries")).toEqual([]);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* answered(api["boards.entries"]({ board: reefBoard }), "boards.entries")).toMatchObject([{ body: "pending" }]);
		yield* clearPublished();
		yield* rollback(boardsHistory.append(Request.make("rollback"), [{ ...event, id: BoardEntryId.make("rollback"), number: 2 }]));
		expect(yield* answered(api["boards.entries"]({ board: reefBoard }), "boards.entries")).toHaveLength(1);
		expect(yield* published()).toEqual([]);
	},
);

import { BoardEntryId } from "@antumbra/platform-vocabulary/board-ids.ts";
