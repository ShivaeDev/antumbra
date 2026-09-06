import { Result, Schema } from "effect";
import { decoder } from "#pr/decode.ts";

export type Verdict = "approved" | "changes-requested" | "commented";

export type Note =
	| { readonly state: "review"; readonly id: number; readonly author: string; readonly verdict: Verdict; readonly body: string; readonly url: string }
	| {
			readonly state: "review-comment";
			readonly id: number;
			readonly author: string;
			readonly path: string;
			readonly line: number | null;
			readonly reply: boolean;
			readonly body: string;
			readonly url: string;
	  }
	| { readonly state: "comment"; readonly id: number; readonly author: string; readonly body: string; readonly url: string };

export type Reviews = { readonly changesRequested: boolean; readonly notes: readonly Note[]; readonly pending: readonly number[] };
export type Inline = { readonly note: Note; readonly review: number | null };

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

const decodeReviews = decoder(Schema.fromJsonString(ReviewsBody));
const decodeInline = decoder(Schema.fromJsonString(InlineBody));
const decodeComments = decoder(Schema.fromJsonString(CommentsBody));

export const reviewsFrom = (body: string): Result.Result<Reviews, string> =>
	Result.map(decodeReviews(body), (reviews) => ({
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

export const inlineFrom = (body: string): Result.Result<readonly Inline[], string> =>
	Result.map(decodeInline(body), (comments) =>
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

export const commentsFrom = (body: string): Result.Result<readonly Note[], string> =>
	Result.map(decodeComments(body), (comments) =>
		comments.map((comment) => ({
			state: "comment" as const,
			id: comment.id,
			author: comment.user.login,
			body: comment.body,
			url: comment.html_url,
		})),
	);
