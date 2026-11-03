import { Result } from "effect";

export type Command =
	| { readonly name: "capture"; readonly label: string; readonly source: "dev" | "prod"; readonly target: Target }
	| { readonly name: "open"; readonly selector: string }
	| { readonly name: "check"; readonly selector: string; readonly target: Target }
	| { readonly name: "list" | "start" | "stop" | "help" };

export type Target = "journal" | "postgres";

export const usage =
	"Usage: pnpm run fixture capture <label> [--source dev|prod] [--target journal|postgres] | list | open <id-or-label> | start | stop | check <id-or-label> [--target journal|postgres]";

const parseCapture = (args: readonly string[]): Result.Result<Command, string> => {
	const [, label] = args;
	if (!label?.trim()) return Result.fail(usage);
	let source: "dev" | "prod" = "dev";
	let target: Target = "journal";
	const seen = new Set<string>();
	for (let index = 2; index < args.length; index += 2) {
		const flag = args[index];
		const value = args[index + 1];
		if (flag === undefined || seen.has(flag)) return Result.fail(usage);
		seen.add(flag);
		if (flag === "--source" && (value === "dev" || value === "prod")) source = value;
		else if (flag === "--target" && (value === "journal" || value === "postgres")) target = value;
		else return Result.fail(usage);
	}
	return Result.succeed({ name: "capture", label, source, target });
};

const parseCheck = (args: readonly string[]): Result.Result<Command, string> => {
	const [, selector, flag, target] = args;
	if (!selector?.trim()) return Result.fail(usage);
	if (args.length === 2) return Result.succeed({ name: "check", selector, target: "journal" });
	if (args.length === 4 && flag === "--target" && (target === "journal" || target === "postgres"))
		return Result.succeed({ name: "check", selector, target });
	return Result.fail(usage);
};

export const parseCommand = (args: readonly string[]): Result.Result<Command, string> => {
	const [name, value] = args;
	switch (name) {
		case "help":
		case "--help":
			if (args.length === 1) return Result.succeed({ name: "help" });
			break;
		case "list":
		case "start":
		case "stop":
			if (args.length === 1) return Result.succeed({ name });
			break;
		case "open":
			if (value?.trim() && args.length === 2) return Result.succeed({ name, selector: value });
			break;
		case "check":
			return parseCheck(args);
		case "capture":
			return parseCapture(args);
	}
	return Result.fail(usage);
};
