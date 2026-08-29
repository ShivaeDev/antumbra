import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { Config, Effect, Option } from "effect";

const FENCE = "\u001f";
const PROBE_TIMEOUT_MS = 5_000;

export const betweenFences = (output: string): Option.Option<string> => {
	const start = output.indexOf(FENCE);
	const end = output.indexOf(FENCE, start + 1);
	return start >= 0 && end > start
		? Option.some(output.slice(start + 1, end))
		: Option.none();
};

const isExecutable = (file: string): boolean => {
	try {
		accessSync(file, constants.X_OK);
		return true;
	} catch {
		return false;
	}
};

// why: the path a CLI is found under is the name it answers to — multi-call
// binaries dispatch on argv[0], so resolving a symlink to its target invokes a
// different tool. Every match is offered in PATH order because the first entry
// bearing the name need not be the tool that owns it.
export const executableCandidates = (
	name: string,
	searchPath: string,
): readonly string[] =>
	searchPath
		.split(delimiter)
		.filter((directory) => directory !== "")
		.map((directory) => join(directory, name))
		.filter(isExecutable);

const probe = (shell: string): Promise<string> =>
	new Promise<string>((resolve, reject) => {
		execFile(
			shell,
			["-ilc", `printf '${FENCE}%s${FENCE}' "$PATH"`],
			{ timeout: PROBE_TIMEOUT_MS },
			(error, stdout) => (error === null ? resolve(stdout) : reject(error)),
		);
	});

// why: an app launched from Finder inherits launchd's PATH, not the user's —
// the login shell is where theirs is declared. Interactive login (-ilc)
// reaches rc files that only load interactively; the fences keep the answer
// apart from whatever those files print.
const loginShellPath: Effect.Effect<Option.Option<string>> = Config.string(
	"SHELL",
).pipe(
	Config.withDefault("/bin/sh"),
	Effect.flatMap((shell) => Effect.tryPromise(() => probe(shell))),
	Effect.map(betweenFences),
	Effect.orElseSucceed(() => Option.none()),
);

export const candidatesOnLoginPath = (
	name: string,
): Effect.Effect<readonly string[]> =>
	loginShellPath.pipe(
		Effect.map(
			Option.match({
				onNone: (): readonly string[] => [],
				onSome: (searchPath) => executableCandidates(name, searchPath),
			}),
		),
	);
