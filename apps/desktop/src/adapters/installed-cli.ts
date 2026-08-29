import { execFile } from "node:child_process";
import type { AntumbraPlugin, PluginContext } from "@antumbra/plugin-api";
import { Effect, Option, type Scope } from "effect";
import { candidatesOnLoginPath } from "#adapters/login-shell.ts";

const VERSION_TIMEOUT_MS = 5_000;

interface Identified {
	readonly executable: string;
	readonly version: string;
}

const reportedVersion = (file: string): Effect.Effect<Option.Option<string>> =>
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
	).pipe(
		Effect.map(Option.some),
		Effect.orElseSucceed(() => Option.none()),
	);

const skipped = (
	name: string,
	executable: string,
	reason: string,
): Effect.Effect<Option.Option<Identified>> =>
	Effect.logWarning(`${name}: ${executable} ${reason}; skipped`).pipe(
		Effect.as(Option.none()),
	);

// why: a file bearing the CLI's name need not be that CLI — a multi-call shim
// answers as whatever it dispatches to. What the candidate calls itself under
// --version is the only proof available before it is spawned in anger, and a
// candidate that cannot say is no candidate.
const identify = (
	name: string,
	identity: RegExp,
	executable: string,
): Effect.Effect<Option.Option<Identified>> =>
	reportedVersion(executable).pipe(
		Effect.flatMap(
			Option.match({
				onNone: () => skipped(name, executable, "answered no --version"),
				onSome: (version) =>
					identity.test(version)
						? Effect.succeed(Option.some({ executable, version }))
						: skipped(name, executable, `calls itself "${version}"`),
			}),
		),
	);

const identifiedOnLoginPath = (
	name: string,
	identity: RegExp,
): Effect.Effect<Option.Option<Identified>> =>
	candidatesOnLoginPath(name).pipe(
		Effect.flatMap((candidates) =>
			Effect.reduce(
				candidates,
				() => Option.none<Identified>(),
				(found, executable) =>
					Option.isSome(found)
						? Effect.succeed(found)
						: identify(name, identity, executable),
			),
		),
	);

// why: Antumbra drives the agent CLIs the user installed and bundles none — a
// backend is offered only when the login shell finds its CLI and that CLI
// names itself, because a backend wired to the wrong binary fails later and
// further from the cause than an absent one. The version is logged so drift
// between a CLI and the SDK that speaks to it has a trace.
export const activateInstalledCli = (
	context: PluginContext,
	name: string,
	identity: RegExp,
	plugin: (executable: string) => AntumbraPlugin,
): Effect.Effect<void, never, Scope.Scope> =>
	identifiedOnLoginPath(name, identity).pipe(
		Effect.flatMap(
			Option.match({
				onNone: () =>
					Effect.logWarning(
						`${name}: no CLI on the login shell PATH identified itself as ${name}; not registered`,
					),
				onSome: ({ executable, version }) =>
					Effect.logInfo(name, { executable, version }).pipe(
						Effect.andThen(plugin(executable).activate(context)),
						Effect.orDie,
					),
			}),
		),
	);
