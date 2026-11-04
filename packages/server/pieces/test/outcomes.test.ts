import { answered } from "@antumbra/app-testing/answers.ts";
import { postgresApp } from "@antumbra/app-testing/postgres.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { expect } from "vitest";
import { chartering, opening, pieceOf, reef, request } from "#test/kit.ts";

postgresApp.it(
	"keeps reported work landing until the pending Change lands",
	[],
	function* ({ api, journal, replayJournal, observeJournal, rebuild }) {
		const legacy = yield* journal();
		yield* legacy.api.voyages.open(opening);
		yield* legacy.api.voyages.quiet({ id: reef });
		yield* legacy.api.pieces.charter(chartering("soundings"));
		yield* legacy.api.pieces.launch({ id: pieceOf("soundings") });
		const repoId = RepoId.make("repo:reef");
		yield* legacy.api.repos.register({ requestId: request(repoId), source: "https://github.com/example/reef.git", defaultRef: "main" });
		const observation = {
			repoId,
			externalId: "41",
			activityAt: 1000,
			baseRef: "main",
			headRef: "work/reef",
			headSha: "sha-1",
			isDraft: false,
			checks: "green",
			review: "approved",
			mergeable: "clean",
			stage: "open",
			feedback: [],
			raw: {},
			title: "Survey",
			url: "https://github.com/example/reef/pull/41",
		} as const;
		const id = pieceOf("soundings");
		yield* legacy.api.changes.adopt({
			requestId: request("change:reef"),
			pieceId: id,
			repoId,
			agentId: null,
			host: "github",
			observation,
			observedAt: new Date(2000).toISOString(),
		});
		yield* legacy.api.reports.land({ pieceId: id, authorAgentId: null, title: "Survey", body: "The work is ready for review" });
		const snapshot = yield* replayJournal(legacy);
		expect(snapshot.pieceSnapshot.outcomes.map((row) => row.status).toSorted()).toEqual(["landed", "pending"]);
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "landing", settledDone: false, concluded: false });
		yield* legacy.api.changes.observe({
			host: "github",
			observation: { ...observation, stage: "landed", activityAt: 3000 },
			attachment: { _tag: "Observed" },
			observedAt: new Date(4000).toISOString(),
		});
		yield* observeJournal(legacy, request("change-landed"));
		expect(yield* api["pieces.progress"]({ id })).toEqual(yield* answered(legacy.api.pieces.progress({ id }), "landed journal progress"));
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "done", settledDone: true, concluded: true });
		yield* rebuild();
		expect(yield* api["pieces.progress"]({ id })).toMatchObject({ state: "done", concluded: true });
	},
);
