import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { realpath } from "node:fs/promises";
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

export const firstExecutable = (
	name: string,
	searchPath: string,
): Option.Option<string> =>
	Option.fromNullishOr(
		searchPath
			.split(delimiter)
			.filter((directory) => directory !== "")
			.map((directory) => join(directory, name))
			.find(isExecutable),
	);

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

// why: realpath hands the binary its canonical location — a symlinked CLI
// looks for helper executables beside the path it was invoked as, and finds
// nothing beside the symlink.
const canonical = (file: string): Effect.Effect<Option.Option<string>> =>
	Effect.tryPromise(() => realpath(file)).pipe(
		Effect.map(Option.some),
		Effect.orElseSucceed(() => Option.none()),
	);

export const resolveOnLoginPath = (
	name: string,
): Effect.Effect<Option.Option<string>> =>
	loginShellPath.pipe(
		Effect.map(
			Option.flatMap((searchPath) => firstExecutable(name, searchPath)),
		),
		Effect.flatMap(
			Option.match({
				onNone: () => Effect.succeed(Option.none()),
				onSome: canonical,
			}),
		),
	);
