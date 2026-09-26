import { Result, Schema } from "effect";
import { decoder, pagesDecoder } from "#pr/decode.ts";

const Verdict = Schema.Literals(["approved", "changes-requested", "commented"]);
type Verdict = typeof Verdict.Type;

const said = { id: Schema.Number, author: Schema.String };

export const Note = Schema.Union([
	Schema.Struct({ state: Schema.Literal("review"), ...said, verdict: Verdict, body: Schema.String, url: Schema.String }),
	Schema.Struct({
		state: Schema.Literal("review-comment"),
		...said,
		path: Schema.String,
		line: Schema.NullOr(Schema.Number),
		reply: Schema.Boolean,
		body: Schema.String,
		url: Schema.String,
	}),
	Schema.Struct({ state: Schema.Literal("comment"), ...said, body: Schema.String, url: Schema.String }),
]);
export type Note = typeof Note.Type;

export const Reviews = Schema.Struct({ changesRequested: Schema.Boolean, notes: Schema.Array(Note), pending: Schema.Array(Schema.Number) });
export type Reviews = typeof Reviews.Type;

export const Inline = Schema.Struct({ note: Note, review: Schema.NullOr(Schema.Number) });
export type Inline = typeof Inline.Type;

const User = Schema.Struct({ login: Schema.String });

const ReviewsBody = Schema.Array(
	Schema.Struct({ body: Schema.String, html_url: Schema.String, id: Schema.Number, state: Schema.String, user: User }),
);

const InlineBody = Schema.Array(
	Schema.Struct({
		body: Schema.String,
		html_url: Schema.String,
		id: Schema.Number,
		in_reply_to_id: Schema.optional(Schema.Number),
		line: Schema.NullOr(Schema.Number),
		path: Schema.String,
		pull_request_review_id: Schema.NullOr(Schema.Number),
		user: User,
	}),
);

const CommentsBody = Schema.Array(Schema.Struct({ body: Schema.String, html_url: Schema.String, id: Schema.Number, user: User }));

const verdictOf = (state: string): Verdict => {
	if (state === "APPROVED") return "approved";
	return state === "CHANGES_REQUESTED" ? "changes-requested" : "commented";
};

const decidedBy = (reviews: ReadonlyArray<{ readonly state: string; readonly user: { readonly login: string } }>): boolean => {
	const latest = new Map<string, string>();
	for (const review of reviews.filter((review) => review.state === "APPROVED" || review.state === "CHANGES_REQUESTED")) {
		latest.set(review.user.login, review.state);
	}
	return [...latest.values()].includes("CHANGES_REQUESTED");
};

const decodeReviews = pagesDecoder(decoder(Schema.fromJsonString(ReviewsBody)));
const decodeInline = pagesDecoder(decoder(Schema.fromJsonString(InlineBody)));
const decodeComments = pagesDecoder(decoder(Schema.fromJsonString(CommentsBody)));

export const reviewsFrom = (pages: readonly string[]): Result.Result<Reviews, string> =>
	Result.map(decodeReviews(pages), (reviews) => ({
		changesRequested: decidedBy(reviews),
		notes: reviews
			.filter((review) => review.state !== "PENDING")
			.map((review) => ({
				state: "review" as const,
				id: review.id,
				author: review.user.login,
				verdict: verdictOf(review.state),
				body: review.body,
				url: review.html_url,
			})),
		pending: reviews.filter((review) => review.state === "PENDING").map((review) => review.id),
	}));

export const inlineFrom = (pages: readonly string[]): Result.Result<readonly Inline[], string> =>
	Result.map(decodeInline(pages), (comments) =>
		comments.map((comment) => ({
			note: {
				state: "review-comment" as const,
				id: comment.id,
				author: comment.user.login,
				path: comment.path,
				line: comment.line,
				reply: comment.in_reply_to_id !== undefined,
				body: comment.body,
				url: comment.html_url,
			},
			review: comment.pull_request_review_id,
		})),
	);

export const commentsFrom = (pages: readonly string[]): Result.Result<readonly Note[], string> =>
	Result.map(decodeComments(pages), (comments) =>
		comments.map((comment) => ({
			state: "comment" as const,
			id: comment.id,
			author: comment.user.login,
			body: comment.body,
			url: comment.html_url,
		})),
	);
