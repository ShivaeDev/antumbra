import { Result, Schema } from "effect";
import { decoder, firstPage, pagesDecoder } from "#pr/decode.ts";

export const Lifecycle = Schema.Literals(["closed", "merged", "open"]);
export type Lifecycle = typeof Lifecycle.Type;

export const Merge = Schema.Literals(["behind", "clean", "conflict"]);
export type Merge = typeof Merge.Type;

export const Pull = Schema.Struct({ head: Schema.String, lifecycle: Lifecycle, merge: Schema.optional(Merge) });
export type Pull = typeof Pull.Type;

const PullBody = Schema.Struct({
	head: Schema.Struct({ sha: Schema.String }),
	mergeable_state: Schema.String,
	merged: Schema.Boolean,
	state: Schema.String,
});

const OpenBody = Schema.Array(Schema.Struct({ number: Schema.Number }));

const merges: Readonly<Record<string, Merge>> = {
	behind: "behind",
	blocked: "clean",
	clean: "clean",
	dirty: "conflict",
	has_hooks: "clean",
	unstable: "clean",
};

const lifecycleOf = (merged: boolean, state: string): Lifecycle => {
	if (merged) return "merged";
	return state === "closed" ? "closed" : "open";
};

const decodePull = decoder(Schema.fromJsonString(PullBody));
const decodeOpen = pagesDecoder(decoder(Schema.fromJsonString(OpenBody)));

export const pullFrom = firstPage(
	(body): Result.Result<Pull, string> =>
		Result.map(decodePull(body), (pull) => ({
			head: pull.head.sha,
			lifecycle: lifecycleOf(pull.merged, pull.state),
			merge: merges[pull.mergeable_state],
		})),
);

export const openFrom = (pages: readonly string[]): Result.Result<readonly number[], string> =>
	Result.map(decodeOpen(pages), (pulls) => pulls.map((pull) => pull.number));
