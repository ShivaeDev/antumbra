import { Result } from "effect";

export const usage = [
	"usage: pnpm pr watch <pull request | owner/repo>... [--until end|ci] [--state <file>]",
	"  a pull request is its link, owner/repo#number, or a bare number in the GitHub repository of the current directory",
	"  owner/repo watches every open pull request of that repository",
	"  --until ci takes exactly one pull request",
].join("\n");

export type Until = "ci" | "end";

export type Target = { readonly number: number; readonly repo: string };

export type Source =
	| { readonly kind: "pull"; readonly number: number; readonly repo: string | undefined }
	| { readonly kind: "repo"; readonly repo: string };

export type Command = { readonly sources: readonly Source[]; readonly state: string | undefined; readonly until: Until };

const linked = /^https:\/\/github\.com\/([^/\s]+\/[^/\s]+)\/pull\/(\d+)(?:[/?#].*)?$/;
const qualified = /^([^/\s#]+\/[^/\s#]+)#(\d+)$/;
const numbered = /^#?(\d+)$/;
const repository = /^([^/\s#]+\/[^/\s#]+)$/;

export const sourceFrom = (spec: string): Source | undefined => {
	const [, repo = "", number = ""] = linked.exec(spec) ?? qualified.exec(spec) ?? [];
	if (repo !== "") return { kind: "pull", number: Number(number), repo };
	const [, bare] = numbered.exec(spec) ?? [];
	if (bare !== undefined) return { kind: "pull", number: Number(bare), repo: undefined };
	const [, whole] = repository.exec(spec) ?? [];
	return whole === undefined ? undefined : { kind: "repo", repo: whole };
};

export const keyOf = (target: Target): string => `${target.repo}#${target.number}`;

const flags = new Set(["--state", "--until"]);

type Parts = { readonly options: ReadonlyMap<string, string>; readonly specs: readonly string[] };

const split = (args: readonly string[]): Parts | undefined => {
	const options = new Map<string, string>();
	const specs: string[] = [];
	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index] ?? "";
		const value = args[index + 1];
		if (!arg.startsWith("-")) {
			specs.push(arg);
			continue;
		}
		if (!flags.has(arg) || options.has(arg) || value === undefined || value.startsWith("-")) return undefined;
		options.set(arg, value);
		index += 1;
	}
	return { options, specs };
};

const sourcesFrom = (specs: readonly string[]): Result.Result<readonly Source[], string> => {
	const sources: Source[] = [];
	for (const spec of specs) {
		const source = sourceFrom(spec);
		if (source === undefined) return Result.fail(`not a pull request or repository: "${spec}"\n${usage}`);
		sources.push(source);
	}
	return Result.succeed(sources);
};

export const parseCommand = (args: readonly string[]): Result.Result<Command, string> => {
	const [verb, ...rest] = args;
	const parts = split(rest);
	if (verb !== "watch" || parts === undefined || parts.specs.length === 0) return Result.fail(usage);
	const until = parts.options.get("--until") ?? "end";
	if (until !== "ci" && until !== "end") return Result.fail(usage);
	return Result.flatMap(sourcesFrom(parts.specs), (sources) => {
		if (until === "ci" && (sources.length !== 1 || sources[0]?.kind !== "pull")) return Result.fail(usage);
		return Result.succeed({ sources, state: parts.options.get("--state"), until });
	});
};

type Resolved = { readonly repos: readonly string[]; readonly targets: readonly Target[] };

export const needsHere = (sources: readonly Source[]): boolean => sources.some((source) => source.kind === "pull" && source.repo === undefined);

export const resolved = (sources: readonly Source[], here: string): Resolved => {
	const targets = new Map<string, Target>();
	for (const source of sources) {
		if (source.kind !== "pull") continue;
		const target = { number: source.number, repo: source.repo ?? here };
		targets.set(keyOf(target), target);
	}
	return { repos: [...new Set(sources.flatMap((source) => (source.kind === "repo" ? [source.repo] : [])))], targets: [...targets.values()] };
};
