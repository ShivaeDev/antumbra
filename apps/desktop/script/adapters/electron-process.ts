import { type ChildProcess, spawn } from "node:child_process";
import { createRequire } from "node:module";
import { join } from "node:path";
import { Data, Effect } from "effect";

export class ElectronResolveError extends Data.TaggedError(
	"ElectronResolveError",
)<{ readonly message: string }> {}

const electronBinary = (): Effect.Effect<string, ElectronResolveError> => {
	const resolved: unknown = createRequire(import.meta.url)("electron");
	return typeof resolved === "string"
		? Effect.succeed(resolved)
		: Effect.fail(
				new ElectronResolveError({
					message: "the electron package did not resolve to a binary path",
				}),
			);
};

export const spawnElectron = (root: string, rendererUrl: string) =>
	Effect.flatMap(electronBinary(), (binary) =>
		Effect.sync(() =>
			spawn(
				binary,
				[join(root, "out", "main.js"), `--renderer-url=${rendererUrl}`],
				{ stdio: "inherit" },
			),
		),
	);

export const waitForExit = (child: ChildProcess) =>
	Effect.callback<number>((resume) => {
		child.on("exit", (code) => {
			resume(Effect.succeed(code ?? 0));
		});
	});
