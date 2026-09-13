import { describe, expect, it } from "@effect/vitest";
import { Effect } from "effect";
import { mapPullRequest } from "#mapping.ts";
import { decodeObserveResponse, type ObservedNode, type PullRequestNode } from "#payload.ts";
import { buildObservePlan } from "#query.ts";
// Recorded from GitHub for pull request 970, which carries an issue comment, 999, which carries a review, and an unresolved number.
import recordedFeedback from "#test/fixtures/feedback-response.json";
// Recorded from GitHub for pull requests 23, 24, 27, 32, and an unresolved number.
import recorded from "#test/fixtures/observe-response.json";

const RECORDED = JSON.stringify(recorded);

const FEEDBACK = JSON.stringify(recordedFeedback);

const FEEDBACK_PLAN = buildObservePlan(
	[970, 999, 999999].map((number) => ({
		name: "antumbra",
		number,
		owner: "ShivaeDev",
		repoId: "repo-antumbra",
	})),
);

const withFeedback = Effect.runSync(decodeObserveResponse("observe-changes", FEEDBACK, FEEDBACK_PLAN.selections));

const feedbackOf = (index: number) => {
	const node = withFeedback[index];
	return node === undefined ? expect.unreachable("the feedback fixture is short") : Effect.runSync(mapPullRequest(node)).feedback;
};

const PLAN = buildObservePlan(
	[23, 24, 27, 32, 9999].map((number) => ({
		name: "antumbra",
		number,
		owner: "ShivaeDev",
		repoId: "repo-antumbra",
	})),
);

const observed = Effect.runSync(decodeObserveResponse("observe-changes", RECORDED, PLAN.selections));

const withNode = (fields: Partial<PullRequestNode>): ObservedNode => {
	const base = observed[0];
	return base === undefined ? expect.unreachable("the fixture is empty") : { node: { ...base.node, ...fields }, raw: base.raw, repoId: base.repoId };
};

const mapped = (fields: Partial<PullRequestNode>) => Effect.runSync(mapPullRequest(withNode(fields)));

type ReviewNode = PullRequestNode["reviews"]["nodes"][number];

const submitted: ReviewNode = {
	author: { login: "octocat" },
	body: "",
	comments: {
		nodes: [
			{
				author: { login: "octocat" },
				body: "This reads the first tide before any has been recorded.",
				createdAt: "2026-09-13T09:00:00Z",
				id: "PRRC_reef",
				line: 42,
				path: "src/reef.ts",
				url: "https://github.com/ShivaeDev/antumbra/pull/41#discussion_r1",
			},
		],
	},
	id: "PRR_reef",
	state: "COMMENTED",
	submittedAt: "2026-09-13T08:59:00Z",
	url: "https://github.com/ShivaeDev/antumbra/pull/41#pullrequestreview-1",
};

const draft: ReviewNode = {
	author: { login: "octocat" },
	body: "Not sent yet",
	comments: { nodes: [] },
	id: "PRR_draft",
	state: "PENDING",
	submittedAt: null,
	url: "https://github.com/ShivaeDev/antumbra/pull/41#pullrequestreview-2",
};

describe("reading GitHub's answer as the neutral vocabulary", () => {
	it("drops the alias for a pull request nobody can see", () => {
		expect(observed).toHaveLength(4);
		expect(observed.map((one) => one.node.number)).toEqual([23, 24, 27, 32]);
	});

	it("maps a merged pull request onto a landed change", () => {
		const merged = observed[0];
		if (merged === undefined) {
			return expect.unreachable("the fixture lost its first node");
		}
		expect(Effect.runSync(mapPullRequest(merged))).toEqual({
			activityAt: Date.parse("2026-08-15T20:24:25Z"),
			baseRef: "main",
			checks: "green",
			externalId: "23",
			feedback: [],
			headRef: "voyages",
			headSha: "5db93d623f85b559613a71cf767889ae71eca980",
			isDraft: false,
			mergeable: "unknown",
			raw: merged.raw,
			repoId: "repo-antumbra",
			review: "none",
			stage: "landed",
			title: "Voyages hold pieces gated by edges; launched pieces are dispatched to crew",
			url: "https://github.com/ShivaeDev/antumbra/pull/23",
		});
	});

	it("maps an open pull request onto an open change", () => {
		const open = observed[3];
		if (open === undefined) {
			return expect.unreachable("the fixture lost its open node");
		}
		const change = Effect.runSync(mapPullRequest(open));
		expect(change.stage).toBe("open");
		expect(change.mergeable).toBe("clean");
		expect(change.externalId).toBe("32");
		expect(change.headRef).toBe("shivae/agent-session-recovery");
	});

	it.effect("preserves an unknown GitHub word as provider evidence", () =>
		Effect.gen(function* () {
			const future = RECORDED.replace('"mergeStateStatus":"UNKNOWN"', '"mergeStateStatus":"FUTURE_MERGE"');
			const [unsupported] = yield* decodeObserveResponse("observe-changes", future, PLAN.selections);
			if (unsupported === undefined) {
				return expect.unreachable("the fixture lost its first node");
			}
			expect(unsupported.node.mergeStateStatus).toEqual({ _tag: "Unknown", raw: "FUTURE_MERGE" });
			const failure = yield* Effect.flip(mapPullRequest(unsupported));
			expect(failure).toMatchObject({
				_tag: "GhOutputInvalid",
				raw: unsupported.raw,
			});
		}),
	);

	it("maps an ordinary blocked review to the visible change state", () => {
		const change = mapped({
			commits: { nodes: [{ commit: { statusCheckRollup: { state: "FAILURE" } } }] },
			mergeStateStatus: "DIRTY",
			reviewDecision: "CHANGES_REQUESTED",
		});
		expect(change.checks).toBe("red");
		expect(change.mergeable).toBe("conflict");
		expect(change.review).toBe("changes_requested");
	});

	it("reads an issue comment as one piece of feedback", () => {
		expect(feedbackOf(0)).toEqual([
			{
				at: Date.parse("2026-09-12T18:30:02Z"),
				author: "marvin-bitterlich",
				body: expect.stringContaining("the start pipeline moves onto declared reconcilers"),
				id: "IC_kwDOT1wvoc8AAAABUKNc7Q",
				kind: "comment",
				line: null,
				path: null,
				url: "https://github.com/ShivaeDev/antumbra/pull/970#issuecomment-5647850733",
				verdict: null,
			},
		]);
	});

	it("reads a review that only commented as feedback carrying its verdict", () => {
		expect(feedbackOf(1)).toEqual([
			{
				at: Date.parse("2026-09-13T14:03:30Z"),
				author: "marvin-bitterlich",
				body: expect.stringContaining("Changes requested before merge."),
				id: "PRR_kwDOT1wvoc8AAAABNWfa0g",
				kind: "review",
				line: null,
				path: null,
				url: "https://github.com/ShivaeDev/antumbra/pull/999#pullrequestreview-5190965970",
				verdict: "commented",
			},
		]);
	});

	it("reads a review's own comments as inline feedback and leaves a draft review alone", () => {
		const change = mapped({ reviews: { nodes: [submitted, draft] } });
		expect(change.feedback).toMatchObject([
			{ body: "", id: "PRR_reef", kind: "review", verdict: "commented" },
			{ at: Date.parse("2026-09-13T09:00:00Z"), id: "PRRC_reef", kind: "inline", line: 42, path: "src/reef.ts", verdict: null },
		]);
	});

	it.effect("refuses a review state GitHub has not taught this mapping", () =>
		Effect.gen(function* () {
			const future = FEEDBACK.replace('"state":"COMMENTED"', '"state":"FUTURE_REVIEW"');
			const [, unsupported] = yield* decodeObserveResponse("observe-changes", future, FEEDBACK_PLAN.selections);
			if (unsupported === undefined) {
				return expect.unreachable("the feedback fixture lost its review");
			}
			expect(yield* Effect.flip(mapPullRequest(unsupported))).toMatchObject({ _tag: "GhOutputInvalid" });
		}),
	);

	it("reads a missing check rollup as no signal at all", () => {
		expect(
			mapped({
				commits: { nodes: [{ commit: { statusCheckRollup: null } }] },
			}).checks,
		).toBe("none");
	});
});
