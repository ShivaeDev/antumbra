import { Result, Schema } from "effect";
import type { Target } from "#pr/command.ts";
import { decoder } from "#pr/decode.ts";
import { perPage, type Resource } from "#pr/pages.ts";

const decodeList = decoder(Schema.fromJsonString(Schema.Array(Schema.Unknown)));
const decodeRuns = decoder(Schema.fromJsonString(Schema.Struct({ check_runs: Schema.Array(Schema.Unknown) })));

const unpaged = () => 0;
const listed = (body: string) => Result.match(decodeList(body), { onFailure: unpaged, onSuccess: (items) => items.length });
const runs = (body: string) => Result.match(decodeRuns(body), { onFailure: unpaged, onSuccess: (checks) => checks.check_runs.length });

const page = `per_page=${perPage}`;

export const pull = (target: Target): Resource => ({ path: `repos/${target.repo}/pulls/${target.number}`, size: unpaged });
export const checks = (target: Target, head: string): Resource => ({ path: `repos/${target.repo}/commits/${head}/check-runs?${page}`, size: runs });
export const statuses = (target: Target, head: string): Resource => ({ path: `repos/${target.repo}/commits/${head}/status?${page}`, size: unpaged });
export const reviews = (target: Target): Resource => ({ path: `repos/${target.repo}/pulls/${target.number}/reviews?${page}`, size: listed });
export const reviewComments = (target: Target): Resource => ({
	path: `repos/${target.repo}/pulls/${target.number}/comments?${page}`,
	size: listed,
});
export const issueComments = (target: Target): Resource => ({
	path: `repos/${target.repo}/issues/${target.number}/comments?${page}`,
	size: listed,
});
export const openPulls = (repo: string): Resource => ({ path: `repos/${repo}/pulls?state=open&${page}`, size: listed });
