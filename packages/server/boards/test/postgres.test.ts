import { answered, eventually } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { Request } from "@antumbra/platform-vocabulary/id.ts";
import { Deferred, Effect, Fiber } from "effect";
import { expect } from "vitest";
import { chartering, noting, opening, reef, reefBoard, soundings, soundingsBoard } from "#test/kit.ts";

postgresApp.it(
	"replays notes and summaries into the same digest and smoothing decisions",
	[],
	function* ({ api, journal, replayJournal, rebuild, clock, clearPublished, published }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open(opening);
		yield* legacy.api.pieces.charter(chartering);
		yield* legacy.api.pieces.landVerdict({ id: soundings, verdict: "delivered" });
		yield* legacy.api.boards.write(noting("shoal", "the shoal shelves fast", soundingsBoard));
		yield* legacy.api.boards.write(noting("wind", "the wind backed"));
		yield* legacy.api.boards.write(noting("tide", "the tide ebbed"));
		yield* legacy.api.boards.summarize({
			board: reefBoard,
			author: "smoother",
			body: "a new approach",
			coversFrom: 1,
			coversTo: 2,
			level: "day",
			requestId: Request.make("summary"),
		});
		yield* eventually(
			legacy.api.boards.pendingSmoothing({}),
			(attempts) => attempts.some((attempt) => attempt.pieceId === soundings) && attempts.some((attempt) => attempt.pieceId === null),
			"automatic smoothing attempts to commit",
		);
		yield* replayJournal(legacy);
		expect(yield* api["boards.display"]({ board: reefBoard })).toEqual(yield* answered(legacy.api.boards.display({ board: reefBoard }), "display"));
		expect(yield* api["boards.digest"]({ board: reefBoard })).toEqual(yield* answered(legacy.api.boards.digest({ board: reefBoard }), "digest"));
		expect(yield* api["boards.under"]({ board: reefBoard, summaryId: "summary" })).toEqual(
			yield* answered(legacy.api.boards.under({ board: reefBoard, summaryId: "summary" }), "sources"),
		);
		const input = { voyageId: reef, pieceId: null, throughToday: true, by: "admiral" as const, requestId: Request.make("smooth") };
		const watched = yield* legacy.watchKeys(["smoothingAttempt", `smoothingAttempt:${reef}`]);
		yield* clearPublished();
		yield* api["boards.requestSmoothing"](input);
		yield* legacy.api.boards.requestSmoothing(input);
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
		const now = new Date(yield* clock.now()).toISOString();
		expect(yield* api["boards.smoothingTargets"]({ id: "smooth", now })).toEqual(
			yield* answered(legacy.api.boards.smoothingTargets({ id: "smooth", now }), "targets"),
		);
		yield* api["boards.finishSmoothing"]({ id: "smooth", status: "failed", detail: "no summary", requestId: Request.make("failed") });
		yield* legacy.api.boards.finishSmoothing({ id: "smooth", status: "failed", detail: "no summary" });
		expect(yield* api["boards.smoothingState"]({ voyageId: reef })).toEqual(
			yield* answered(legacy.api.boards.smoothingState({ voyageId: reef }), "smoothing"),
		);
		yield* rebuild();
		expect(yield* api["boards.digest"]({ board: reefBoard })).toEqual(
			yield* answered(legacy.api.boards.digest({ board: reefBoard }), "rebuilt digest"),
		);
		const before = yield* api["boards.entries"]({ board: reefBoard });
		yield* clearPublished();
		expect(yield* Effect.flip(api["boards.write"](noting("blank", " ")))).toMatchObject({ _tag: "Blank" });
		expect(
			yield* Effect.flip(api["boards.finishSmoothing"]({ id: "missing", status: "succeeded", detail: null, requestId: Request.make("reject") })),
		).toMatchObject({ _tag: "UnknownAttempt" });
		expect(yield* api["boards.entries"]({ board: reefBoard })).toEqual(before);
		expect(yield* published()).toEqual([]);
	},
);

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
		expect(yield* api["boards.entries"]({ board: reefBoard })).toEqual([]);
		expect(yield* published()).toEqual([]);
		yield* Deferred.succeed(release, undefined);
		yield* Fiber.join(pending);
		expect(yield* api["boards.entries"]({ board: reefBoard })).toMatchObject([{ body: "pending" }]);
		yield* clearPublished();
		yield* rollback(boardsHistory.append(Request.make("rollback"), [{ ...event, id: BoardEntryId.make("rollback"), number: 2 }]));
		expect(yield* api["boards.entries"]({ board: reefBoard })).toHaveLength(1);
		expect(yield* published()).toEqual([]);
	},
);

import { BoardEntryId } from "@antumbra/platform-vocabulary/board-ids.ts";
