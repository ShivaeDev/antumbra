import { Result } from "effect";

export const usage = "usage: pnpm pr watch <pull request url or number> [--until end|ci]";

export type Until = "ci" | "end";

export type Target = { readonly number: number; readonly repo: string };

export type Command = { readonly target: Target; readonly until: Until };

const linked = /^https:\/\/github\.com\/([^/\s]+)\/([^/\s]+)\/pull\/(\d+)(?:[/?#].*)?$/;
const numbered = /^#?(\d+)$/;

export const targetFrom = (spec: string): Target | undefined => {
	const link = linked.exec(spec);
	if (link !== null) return { number: Number(link[3]), repo: `${link[1]}/${link[2]}` };
	const bare = numbered.exec(spec);
	if (bare !== null) return { number: Number(bare[1]), repo: "{owner}/{repo}" };
	return undefined;
};

const commandFrom = (spec: string, until: Until): Result.Result<Command, string> => {
	const target = targetFrom(spec);
	if (target === undefined) return Result.fail(`not a pull request: "${spec}"\n${usage}`);
	return Result.succeed({ target, until });
};

export const parseCommand = (args: readonly string[]): Result.Result<Command, string> => {
	const [verb, spec, flag, value] = args;
	if (verb !== "watch" || spec === undefined || spec.startsWith("-")) return Result.fail(usage);
	if (args.length === 2) return commandFrom(spec, "end");
	if (args.length === 4 && flag === "--until" && (value === "ci" || value === "end")) return commandFrom(spec, value);
	return Result.fail(usage);
};

const page = "per_page=100";

export const pullPath = (target: Target): string => `repos/${target.repo}/pulls/${target.number}`;
export const checksPath = (target: Target, head: string): string => `repos/${target.repo}/commits/${head}/check-runs?${page}`;
export const reviewsPath = (target: Target): string => `repos/${target.repo}/pulls/${target.number}/reviews?${page}`;
export const reviewCommentsPath = (target: Target): string => `repos/${target.repo}/pulls/${target.number}/comments?${page}`;
export const issueCommentsPath = (target: Target): string => `repos/${target.repo}/issues/${target.number}/comments?${page}`;
