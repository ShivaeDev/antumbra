import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { checksFrom, combined, statusesFrom } from "#pr/ci.ts";
import { commentsFrom, inlineFrom, reviewsFrom } from "#pr/notes.ts";
import { absorb, nothing, observationFrom, type Reading } from "#pr/observation.ts";
import type { Outcome } from "#pr/pages.ts";
import { openFrom, pullFrom } from "#pr/pull.ts";
import fixture from "#test/fixtures/pr-rest.json" with { type: "json" };

const decoded = <A>(result: Result.Result<A, string>): A => Result.getOrThrow(result);
const at = <A>(items: readonly A[], index: number): A => Result.getOrThrow(Result.fromNullishOr(items[index], () => `no entry ${index}`));

const page = (value: unknown): readonly string[] => [JSON.stringify(value)];
const body = (value: unknown): Outcome => ({ kind: "pages", pages: page(value) });
const same: Outcome = { kind: "same" };

const head = fixture.pull.head.sha;
const reviews = fixture.reviews;
const approval = at(reviews, 1);
const pendingReview = at(reviews, 2);
const inlineComments = fixture["review-comments"];
const firstInline = at(inlineComments, 0);
const pendingComment = at(inlineComments, 1);
const firstComment = at(fixture["issue-comments"], 0);

const seenBy = (reading: Partial<Reading>) =>
	observationFrom(
		absorb(nothing, { checks: undefined, comments: same, inline: same, pull: same, reviews: same, statuses: undefined, ...reading }).pieces,
	);

describe("reading a recorded pull request", () => {
	it("takes the head, the lifecycle and the mergeability", () => {
		expect(decoded(pullFrom(page(fixture.pull)))).toEqual({ head, lifecycle: "merged", merge: undefined });
		expect(decoded(pullFrom(page({ ...fixture.pull, merged: false, mergeable_state: "dirty", state: "open" })))).toEqual({
			head,
			lifecycle: "open",
			merge: "conflict",
		});
		const merge = (state: string) => decoded(pullFrom(page({ ...fixture.pull, mergeable_state: state }))).merge;
		expect(["behind", "blocked", "clean", "unknown", "draft"].map(merge)).toEqual(["behind", "clean", "clean", undefined, undefined]);
		expect(decoded(pullFrom(page({ ...fixture.pull, merged: false, state: "closed" }))).lifecycle).toBe("closed");
	});

	it("refuses output it cannot read", () => {
		expect(Result.isFailure(pullFrom(["not json"]))).toBe(true);
		expect(Result.isFailure(pullFrom(['{"state":"open"}']))).toBe(true);
	});
});

describe("reading recorded check runs", () => {
	it("names the checks that failed", () => {
		expect(decoded(checksFrom(page(fixture.checks), head))).toEqual({ ci: "failed", failed: ["govulncheck"], head });
	});

	it("rates a run still going as pending, and an empty set as none", () => {
		const queued = { ...fixture.checks, check_runs: fixture.checks.check_runs.map((run) => ({ ...run, conclusion: null, status: "queued" })) };
		expect(decoded(checksFrom(page(queued), head)).ci).toBe("pending");
		expect(decoded(checksFrom(page({ check_runs: [], total_count: 0 }), head)).ci).toBe("none");
	});

	it("reads the runs of every page", () => {
		const [first, second] = fixture.checks.check_runs;
		const read = decoded(checksFrom([JSON.stringify({ check_runs: [first] }), JSON.stringify({ check_runs: [second] })], head));
		expect(read).toEqual({ ci: "failed", failed: ["govulncheck"], head });
	});

	it("does not count a skipped check as a failure", () => {
		const skipped = { ...fixture.checks, check_runs: fixture.checks.check_runs.filter((run) => run.conclusion !== "failure") };
		expect(decoded(checksFrom(page(skipped), head))).toEqual({ ci: "green", failed: [], head });
	});
});

describe("reading commit statuses", () => {
	const status = (state: string, statuses: readonly unknown[]) => statusesFrom(page({ state, statuses, total_count: statuses.length }), head);

	it("rates the combined state and names the contexts that failed", () => {
		expect(decoded(status("success", [{ context: "deploy", state: "success" }])).ci).toBe("green");
		expect(decoded(status("pending", [{ context: "deploy", state: "pending" }])).ci).toBe("pending");
		expect(
			decoded(
				status("failure", [
					{ context: "deploy", state: "error" },
					{ context: "lint", state: "success" },
				]),
			),
		).toEqual({
			ci: "failed",
			failed: ["deploy"],
			head,
		});
	});

	it("rates a commit without statuses as none, though GitHub calls it pending", () => {
		expect(decoded(status("pending", [])).ci).toBe("none");
	});

	it("holds a verdict until both checks and statuses settle", () => {
		expect(combined("green", "pending")).toBe("pending");
		expect(combined("failed", "pending")).toBe("pending");
		expect(combined("green", "failed")).toBe("failed");
		expect(combined("none", "green")).toBe("green");
		expect(combined("none", "none")).toBe("none");
	});
});

describe("reading the open pull requests of a repository", () => {
	it("takes their numbers from every page", () => {
		expect(decoded(openFrom([JSON.stringify([{ number: 3 }, { number: 2 }]), JSON.stringify([{ number: 1 }])]))).toEqual([3, 2, 1]);
	});
});

describe("reading recorded reviews", () => {
	it("carries every submitted review with its verdict", () => {
		const read = decoded(reviewsFrom(page(reviews)));
		expect(read.notes.map((note) => note.state)).toEqual(["review", "review", "review", "review"]);
		expect(read.notes.map((note) => (note.state === "review" ? note.verdict : ""))).toEqual([
			"commented",
			"approved",
			"changes-requested",
			"commented",
		]);
		expect(at(read.notes, 1)).toEqual({
			state: "review",
			id: approval.id,
			author: approval.user.login,
			verdict: "approved",
			body: approval.body,
			url: approval.html_url,
		});
	});

	it("reads the review decision from the latest review of each author", () => {
		expect(decoded(reviewsFrom(page(reviews))).changesRequested).toBe(true);
		const answered = [...reviews, { ...approval, id: 9, state: "APPROVED", user: pendingReview.user }];
		expect(decoded(reviewsFrom(page(answered))).changesRequested).toBe(false);
	});

	it("skips a review that is still a draft", () => {
		const drafting = reviews.map((review) => (review.id === pendingReview.id ? { ...review, state: "PENDING" } : review));
		const read = decoded(reviewsFrom(page(drafting)));
		expect(read.pending).toEqual([pendingReview.id]);
		expect(read.notes.map((note) => note.id)).not.toContain(pendingReview.id);
		expect(read.changesRequested).toBe(false);
	});
});

describe("reading recorded comments", () => {
	it("carries an inline comment with its place and whether it answers another", () => {
		const read = decoded(inlineFrom(page(inlineComments)));
		expect(read.map((entry) => entry.note.state === "review-comment" && entry.note.reply)).toEqual([false, false, true]);
		expect(at(read, 0).note).toEqual({
			state: "review-comment",
			id: firstInline.id,
			author: firstInline.user.login,
			path: firstInline.path,
			line: firstInline.line,
			reply: false,
			body: firstInline.body,
			url: firstInline.html_url,
		});
	});

	it("carries a conversation comment", () => {
		const read = decoded(commentsFrom(page(fixture["issue-comments"])));
		expect(read).toHaveLength(2);
		expect(at(read, 0)).toEqual({
			state: "comment",
			id: firstComment.id,
			author: firstComment.user.login,
			body: firstComment.body,
			url: firstComment.html_url,
		});
	});
});

describe("what one poll saw", () => {
	const full = {
		comments: body(fixture["issue-comments"]),
		inline: body(inlineComments),
		pull: body(fixture.pull),
		reviews: body(reviews),
	};

	it("gathers every kind of note", () => {
		expect(seenBy(full)?.notes.map((note) => note.state)).toEqual([
			"review",
			"review",
			"review",
			"review",
			"review-comment",
			"review-comment",
			"review-comment",
			"comment",
			"comment",
		]);
	});

	it("hides the comments of a review that is still a draft", () => {
		const drafting = reviews.map((review) => (review.id === pendingComment.pull_request_review_id ? { ...review, state: "PENDING" } : review));
		expect(seenBy({ ...full, reviews: body(drafting) })?.notes.map((note) => note.id)).not.toContain(pendingComment.id);
	});

	it("ignores check runs that belong to another head", () => {
		expect(seenBy({ ...full, checks: { head: "another-head", outcome: body(fixture.checks) } })?.ci).toBe("none");
		expect(seenBy({ ...full, checks: { head, outcome: body(fixture.checks) } })?.ci).toBe("failed");
	});

	it("has nothing to say before the pull request has been read", () => {
		expect(observationFrom(nothing)).toBeUndefined();
	});
});
