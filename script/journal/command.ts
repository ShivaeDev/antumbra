import { Result } from "effect";

export const usage = "usage: pnpm journal reset\n       pnpm journal facts [--tail <count>]";

export type Command = { readonly kind: "reset" } | { readonly kind: "facts"; readonly tail: number | undefined };

const count = (raw: string): number | undefined => {
	const parsed = Number(raw);
	return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

export const parseCommand = (args: readonly string[]): Result.Result<Command, string> => {
	const [verb, flag, value] = args;
	if (args.length === 1 && verb === "reset") return Result.succeed({ kind: "reset" });
	if (args.length === 1 && verb === "facts") return Result.succeed({ kind: "facts", tail: undefined });
	if (args.length !== 3 || verb !== "facts" || flag !== "--tail" || value === undefined) return Result.fail(usage);
	const tail = count(value);
	if (tail === undefined) return Result.fail(`--tail takes a positive whole number, not "${value}"\n${usage}`);
	return Result.succeed({ kind: "facts", tail });
};
