import { Result } from "effect";
import { describe, expect, it } from "vitest";
import { commentsFrom, inlineFrom, reviewsFrom } from "#pr/notes.ts";
import { absorb, nothing, type Outcome, observationFrom, type Reading } from "#pr/observation.ts";
import { checksFrom, pullFrom } from "#pr/pull.ts";
import fixture from "#test/fixtures/pr-rest.json" with { type: "json" };

const decoded = <A>(result: Result.Result<A, string>): A => Result.getOrThrow(result);
const at = <A>(items: readonly A[], index: number): A => Result.getOrThrow(Result.fromNullishOr(items[index], () => `no entry ${index}`));

const body = (value: unknown): Outcome => ({ kind: "body", body: JSON.stringify(value) });
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
	observationFrom(absorb(nothing, { checks: undefined, comments: same, inline: same, pull: same, reviews: same, ...reading }).pieces);

describe("reading a recorded pull request", () => {
	it("takes the head, the lifecycle and the conflict", () => {
		expect(decoded(pullFrom(JSON.stringify(fixture.pull)))).toEqual({ conflict: undefined, head, lifecycle: "merged" });
		expect(decoded(pullFrom(JSON.stringify({ ...fixture.pull, merged: false, mergeable_state: "dirty", state: "open" })))).toEqual({
			conflict: true,
			head,
			lifecycle: "open",
		});
		expect(decoded(pullFrom(JSON.stringify({ ...fixture.pull, merged: false, state: "closed" }))).lifecycle).toBe("closed");
	});

	it("refuses output it cannot read", () => {
		expect(Result.isFailure(pullFrom("not json"))).toBe(true);
		expect(Result.isFailure(pullFrom('{"state":"open"}'))).toBe(true);
	});
});

describe("reading recorded check runs", () => {
	it("names the checks that failed", () => {
		expect(decoded(checksFrom(JSON.stringify(fixture.checks)))).toEqual({ ci: "failed", failed: ["govulncheck"] });
	});

	it("rates a run still going as pending, and an empty set as none", () => {
		const queued = { ...fixture.checks, check_runs: fixture.checks.check_runs.map((run) => ({ ...run, conclusion: null, status: "queued" })) };
		expect(decoded(checksFrom(JSON.stringify(queued))).ci).toBe("pending");
		expect(decoded(checksFrom(JSON.stringify({ check_runs: [], total_count: 0 }))).ci).toBe("none");
	});

	it("does not count a skipped check as a failure", () => {
		const skipped = { ...fixture.checks, check_runs: fixture.checks.check_runs.filter((run) => run.conclusion !== "failure") };
		expect(decoded(checksFrom(JSON.stringify(skipped)))).toEqual({ ci: "green", failed: [] });
	});
});

describe("reading recorded reviews", () => {
	it("carries every submitted review with its verdict", () => {
		const read = decoded(reviewsFrom(JSON.stringify(reviews)));
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
		expect(decoded(reviewsFrom(JSON.stringify(reviews))).changesRequested).toBe(true);
		const answered = [...reviews, { ...approval, id: 9, state: "APPROVED", user: pendingReview.user }];
		expect(decoded(reviewsFrom(JSON.stringify(answered))).changesRequested).toBe(false);
	});

	it("skips a review that is still a draft", () => {
		const drafting = reviews.map((review) => (review.id === pendingReview.id ? { ...review, state: "PENDING" } : review));
		const read = decoded(reviewsFrom(JSON.stringify(drafting)));
		expect(read.pending).toEqual([pendingReview.id]);
		expect(read.notes.map((note) => note.id)).not.toContain(pendingReview.id);
		expect(read.changesRequested).toBe(false);
	});
});

describe("reading recorded comments", () => {
	it("carries an inline comment with its place and whether it answers another", () => {
		const read = decoded(inlineFrom(JSON.stringify(inlineComments)));
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
		const read = decoded(commentsFrom(JSON.stringify(fixture["issue-comments"])));
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
