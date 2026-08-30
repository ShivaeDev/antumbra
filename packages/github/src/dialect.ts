import { Schema, SchemaGetter } from "effect";

export const UnknownGitHubWord = Schema.TaggedStruct("Unknown", {
	raw: Schema.String,
});
export type UnknownGitHubWord = typeof UnknownGitHubWord.Type;

const KnownPullState = Schema.Literals(["CLOSED", "MERGED", "OPEN"]);
const KnownMergeState = Schema.Literals(["BEHIND", "BLOCKED", "CLEAN", "DIRTY", "DRAFT", "HAS_HOOKS", "UNKNOWN", "UNSTABLE"]);
const KnownReviewDecision = Schema.Literals(["APPROVED", "CHANGES_REQUESTED", "REVIEW_REQUIRED"]);
const KnownCheckState = Schema.Literals(["ERROR", "EXPECTED", "FAILURE", "PENDING", "SUCCESS"]);

const unknown = (raw: string): UnknownGitHubWord => UnknownGitHubWord.make({ raw });
const encoded = (word: string | UnknownGitHubWord): string => (typeof word === "string" ? word : word.raw);

export const GitHubPullState = Schema.String.pipe(
	Schema.decodeTo(Schema.Union([KnownPullState, UnknownGitHubWord]), {
		decode: SchemaGetter.transform((raw) => (Schema.is(KnownPullState)(raw) ? raw : unknown(raw))),
		encode: SchemaGetter.transform(encoded),
	}),
);
export type GitHubPullState = typeof GitHubPullState.Type;

export const GitHubMergeState = Schema.String.pipe(
	Schema.decodeTo(Schema.Union([KnownMergeState, UnknownGitHubWord]), {
		decode: SchemaGetter.transform((raw) => (Schema.is(KnownMergeState)(raw) ? raw : unknown(raw))),
		encode: SchemaGetter.transform(encoded),
	}),
);
export type GitHubMergeState = typeof GitHubMergeState.Type;

export const GitHubReviewDecision = Schema.String.pipe(
	Schema.decodeTo(Schema.Union([KnownReviewDecision, UnknownGitHubWord]), {
		decode: SchemaGetter.transform((raw) => (Schema.is(KnownReviewDecision)(raw) ? raw : unknown(raw))),
		encode: SchemaGetter.transform(encoded),
	}),
);
export type GitHubReviewDecision = typeof GitHubReviewDecision.Type;

export const GitHubCheckState = Schema.String.pipe(
	Schema.decodeTo(Schema.Union([KnownCheckState, UnknownGitHubWord]), {
		decode: SchemaGetter.transform((raw) => (Schema.is(KnownCheckState)(raw) ? raw : unknown(raw))),
		encode: SchemaGetter.transform(encoded),
	}),
);
export type GitHubCheckState = typeof GitHubCheckState.Type;
