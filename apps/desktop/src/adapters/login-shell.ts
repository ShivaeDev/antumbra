import { execFile } from "node:child_process";
import { accessSync, constants } from "node:fs";
import { delimiter, join } from "node:path";
import { Config, Effect, Option } from "effect";

const FENCE = "\u001f";
const PROBE_TIMEOUT_MS = 5_000;

const betweenFences = (output: string): Option.Option<string> => {
	const start = output.indexOf(FENCE);
	const end = output.indexOf(FENCE, start + 1);
	return start >= 0 && end > start ? Option.some(output.slice(start + 1, end)) : Option.none();
};

const isExecutable = (file: string): boolean => {
	try {
		accessSync(file, constants.X_OK);
		return true;
	} catch {
		return false;
	}
};

// Basename-sensitive launchers may dispatch differently through symlinks, so preserve the discovered path.
const firstExecutable = (name: string, searchPath: string): Option.Option<string> =>
	Option.fromNullishOr(
		searchPath
			.split(delimiter)
			.filter((directory) => directory !== "")
			.map((directory) => join(directory, name))
			.find(isExecutable),
	);

const probe = (shell: string): Promise<string> =>
	new Promise<string>((resolve, reject) => {
		execFile(shell, ["-ilc", `printf '${FENCE}%s${FENCE}' "$PATH"`], { timeout: PROBE_TIMEOUT_MS }, (error, stdout) =>
			error === null ? resolve(stdout) : reject(error),
		);
	});

// Finder inherits launchd's PATH; an interactive login shell loads the user's CLI path. Fences isolate it from shell startup output.
const loginShellPath: Effect.Effect<Option.Option<string>> = Config.string("SHELL").pipe(
	Config.withDefault("/bin/sh"),
	Effect.flatMap((shell) => Effect.tryPromise(() => probe(shell))),
	Effect.map(betweenFences),
	Effect.orElseSucceed(() => Option.none()),
);

export const findOnLoginPath = (name: string): Effect.Effect<Option.Option<string>> =>
	loginShellPath.pipe(Effect.map(Option.flatMap((searchPath) => firstExecutable(name, searchPath))));
