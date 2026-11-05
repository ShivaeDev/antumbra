import { legacyFacts } from "@antumbra/app-testing/legacy.ts";
import { type ChangeRow, change } from "@antumbra/domain-changes/rows/change.ts";
import type { ChangeFeedbackRow } from "@antumbra/domain-changes/rows/change-feedback.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { RepoId } from "@antumbra/platform-vocabulary/repos-ids.ts";
import { Schema } from "effect";
import { expect } from "vitest";

const AT = "2026-09-13T09:00:00.000Z";

const changeRow = (id: string, externalId: string): ChangeRow => ({
	id: ChangeId.make(id),
	repoId: RepoId.make("repo-reef"),
	host: "github",
	title: "The tide is read before it is recorded",
	body: "",
	headRef: "work/reef",
	baseRef: "main",
	headSha: "sha-reef",
	preparedHeadRef: null,
	preparedHeadSha: null,
	publicationRequestId: null,
	publicationError: null,
	proposalFrozenAt: null,
	worktreePath: null,
	workingDiff: null,
	workingTreeStatus: null,
	submissionKey: null,
	stage: "open",
	draftAt: null,
	url: `https://github.com/example/reef/pull/${externalId}`,
	externalId,
	checks: "green",
	review: "none",
	mergeable: "clean",
	openedByAgentId: null,
	originSessionId: null,
	raw: null,
	activityAt: AT,
	observedAt: AT,
	landedAt: null,
	withdrawnAt: null,
	archivedAt: null,
	createdAt: AT,
});

const feedbackRow = (id: string, changeId: string): ChangeFeedbackRow => ({
	id,
	changeId: ChangeId.make(changeId),
	kind: "comment",
	author: "octocat",
	verdict: null,
	path: null,
	line: null,
	body: "This reads the first tide before any has been recorded.",
	url: `https://github.com/example/reef/pull/41#issuecomment-${id}`,
	at: AT,
	forwardedAt: null,
});

const encodeChange = Schema.encodeUnknownSync(change.Row);

legacyFacts.it(
	"fills absent legacy feedback and preserves feedback already recorded after SQL rebuild",
	[],
	function* ({ seed, changes, feedback, facts, rebuild }) {
		yield* seed([
			{
				name: "RepoRegistered",
				payload: { id: "repo-reef", name: "reef", source: "https://github.com/example/reef.git", defaultRef: "main", createdAt: AT },
			},
			{ name: "ChangeObserved", payload: { change: encodeChange(changeRow("change-older", "41")), transition: null } },
			{
				name: "ChangeObserved",
				payload: { change: encodeChange(changeRow("change-newer", "42")), transition: null, feedback: [feedbackRow("IC_kept", "change-newer")] },
			},
		]);
		yield* rebuild();
		expect(yield* changes()).toEqual(
			expect.arrayContaining([
				{ id: "change-newer", review: "none" },
				{ id: "change-older", review: "none" },
			]),
		);
		expect(yield* feedback()).toEqual([{ id: "IC_kept", changeId: "change-newer" }]);
		expect((yield* facts()).find((fact) => fact.name === "ChangeObserved")?.payload).toMatchObject({ feedback: [] });
	},
);
