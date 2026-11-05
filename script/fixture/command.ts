import { Result } from "effect";

export type Command =
	| { readonly name: "capture"; readonly label: string; readonly source: "dev" | "prod" }
	| { readonly name: "open"; readonly selector: string }
	| { readonly name: "check"; readonly selector: string }
	| { readonly name: "list" | "start" | "stop" | "help" };

export const usage = "Usage: pnpm run fixture capture <label> [--source dev|prod] | list | open <id-or-label> | start | stop | check <id-or-label>";

const parseCapture = (args: readonly string[]): Result.Result<Command, string> => {
	const [, label] = args;
	if (!label?.trim()) return Result.fail(usage);
	let source: "dev" | "prod" = "dev";
	const seen = new Set<string>();
	for (let index = 2; index < args.length; index += 2) {
		const flag = args[index];
		const value = args[index + 1];
		if (flag === undefined || seen.has(flag)) return Result.fail(usage);
		seen.add(flag);
		if (flag === "--source" && (value === "dev" || value === "prod")) source = value;
		else return Result.fail(usage);
	}
	return Result.succeed({ name: "capture", label, source });
};

const parseCheck = (args: readonly string[]): Result.Result<Command, string> => {
	const [, selector] = args;
	if (!selector?.trim()) return Result.fail(usage);
	if (args.length === 2) return Result.succeed({ name: "check", selector });
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
