import { execFile } from "node:child_process";
import type { AntumbraPlugin, PluginContext } from "@antumbra/plugin-api";
import { Effect, Option, type Scope } from "effect";
import { resolveOnLoginPath } from "#adapters/login-shell.ts";

const VERSION_TIMEOUT_MS = 5_000;

const reportedVersion = (file: string): Effect.Effect<string> =>
	Effect.tryPromise(
		() =>
			new Promise<string>((resolve, reject) => {
				execFile(
					file,
					["--version"],
					{ timeout: VERSION_TIMEOUT_MS },
					(error, stdout) =>
						error === null ? resolve(stdout.trim()) : reject(error),
				);
			}),
	).pipe(Effect.orElseSucceed(() => "unknown"));

// why: Antumbra drives the agent CLIs the user installed and bundles none —
// a backend is offered only when the login shell can find its CLI, because a
// backend that cannot spawn is not a backend. The version is logged so drift
// between a CLI and the SDK that speaks to it has a trace.
export const activateInstalledCli = (
	context: PluginContext,
	name: string,
	plugin: (executable: string) => AntumbraPlugin,
): Effect.Effect<void, never, Scope.Scope> =>
	resolveOnLoginPath(name).pipe(
		Effect.flatMap(
			Option.match({
				onNone: () =>
					Effect.logWarning(
						`${name}: not on the login shell PATH; not registered`,
					),
				onSome: (executable) =>
					reportedVersion(executable).pipe(
						Effect.flatMap((version) =>
							Effect.logInfo(name, { executable, version }),
						),
						Effect.andThen(plugin(executable).activate(context)),
						Effect.orDie,
					),
			}),
		),
	);
