import { Result } from "effect";

export type Command =
	| { readonly name: "capture"; readonly label: string; readonly source: "dev" | "prod" }
	| { readonly name: "open" | "check"; readonly selector: string }
	| { readonly name: "list" | "start" | "stop" | "help" };

export const usage = "Usage: pnpm run fixture capture <label> [--source dev|prod] | list | open <id-or-label> | start | stop | check <id-or-label>";

const parseCapture = (args: readonly string[]): Result.Result<Command, string> => {
	const [, label, flag, source] = args;
	if (!label?.trim()) return Result.fail(usage);
	if (args.length === 2) return Result.succeed({ name: "capture", label, source: "dev" });
	if (args.length === 4 && flag === "--source" && (source === "dev" || source === "prod")) return Result.succeed({ name: "capture", label, source });
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
		case "check":
			if (value?.trim() && args.length === 2) return Result.succeed({ name, selector: value });
			break;
		case "capture":
			return parseCapture(args);
	}
	return Result.fail(usage);
};
