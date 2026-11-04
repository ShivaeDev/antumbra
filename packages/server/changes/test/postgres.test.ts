import { answered } from "@antumbra/app-testing/entry.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Effect } from "effect";
import { expect } from "vitest";
import { adoption, chartering, comment, opening, pieceId, registration, repoId, request, seen, voyageId } from "#test/kit.ts";

postgresApp.it(
	"replays Change observations and outcomes then accepts later host evidence with the same refresh keys",
	[],
	function* ({ api, journal, replayJournal, changesHistory, clearPublished, published, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open(opening);
		yield* legacy.api.pieces.charter(chartering);
		yield* legacy.api.repos.register(registration);
		yield* legacy.api.changes.adopt(adoption);
		yield* replayJournal(legacy);
		expect(yield* api["changes.all"]({})).toEqual(yield* answered(legacy.api.changes.all({}), "changes"));
		expect(yield* api["changes.quay"]({})).toEqual(yield* answered(legacy.api.changes.quay({}), "quay"));
		const before = yield* api["changes.all"]({});
		yield* clearPublished();
		expect(
			yield* Effect.flip(api["changes.archive"]({ changeId: ChangeId.make(adoption.requestId), requestId: request("reject-open") })),
		).toMatchObject({ _tag: "ChangeStillOpen" });
		expect(yield* api["changes.all"]({})).toEqual(before);
		expect(yield* published()).toEqual([]);
		const watched = yield* legacy.watchKeys([
			"change",
			`change:${repoId}`,
			"changeTransition",
			`changeTransition:${adoption.requestId}`,
			"changeFeedback",
			`changeFeedback:${adoption.requestId}`,
			"pieceChangeView",
			`pieceChangeView:${pieceId}`,
			"quayChange",
			"pieceOutcome",
			`pieceOutcome:${pieceId}`,
			"voyageActivity",
			`voyageActivity:${voyageId}`,
			"pieceProgress",
			`pieceProgress:${voyageId}`,
			"voyagePieceProgress",
			`voyagePieceProgress:${voyageId}`,
			"voyageProgress",
			"captainReading",
		]);
		const observed = {
			host: "github",
			observation: seen("landed", 3000, [comment("word", "A useful sound", 2500)]),
			attachment: { _tag: "Observed" as const },
			observedAt: new Date(4000).toISOString(),
			requestId: request("landed"),
		};
		yield* api["changes.observe"](observed);
		yield* legacy.api.changes.observe(observed);
		expect(new Set(yield* published())).toEqual(new Set(watched.seen()));
		expect(yield* api["changes.quay"]({})).toEqual(yield* answered(legacy.api.changes.quay({}), "landed quay"));
		expect(yield* api["pieces.progress"]({ id: pieceId })).toEqual(yield* answered(legacy.api.pieces.progress({ id: pieceId }), "piece outcome"));
		expect(yield* api["voyages.progress"]({ id: voyageId })).toEqual(
			yield* answered(legacy.api.voyages.progress({ id: voyageId }), "voyage progress"),
		);
		yield* api["changes.observe"]({ ...observed, requestId: request("late-open"), observation: seen("open", 5000) });
		expect((yield* api["changes.all"]({}))[0]?.stage).toBe("landed");
		const feedback = yield* (yield* changesHistory.rows()).changeFeedback.where({});
		yield* api["changes.forwardFeedback"]({
			changeId: ChangeId.make(adoption.requestId),
			ids: feedback.map((row) => row.id),
			requestId: request("forwarded"),
		});
		expect((yield* (yield* changesHistory.rows()).changeFeedback.where({}))[0]?.forwardedAt).not.toBeNull();
		yield* api["changes.archive"]({ changeId: ChangeId.make(adoption.requestId), requestId: request("archive") });
		expect((yield* api["changes.quay"]({}))[0]?.group).toBe("archived");
		const final = yield* api["changes.all"]({});
		yield* rebuild();
		expect(yield* api["changes.all"]({})).toEqual(final);
		yield* api["repos.forget"]({ id: repoId, requestId: request("forget") });
		expect(yield* api["changes.all"]({})).toEqual([]);
		expect(yield* api["changes.links"]({})).toEqual([]);
		expect(yield* api["changes.quay"]({})).toEqual([]);
		yield* rebuild();
		expect(yield* api["changes.all"]({})).toEqual([]);
	},
);
