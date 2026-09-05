import { type AntumbraPlugin, makeBackendCapacityController, type PluginContext } from "@antumbra/plugin-api";
import { skillFolders } from "@antumbra/skills";
import { Effect, Option } from "effect";
import { bundledCodex } from "#adapters/chatgpt-bundle.ts";
import { type LineProcess, spawnLineProcess } from "#adapters/process.ts";
import { codexBackend } from "#backend.ts";
import { classifyCodexCapacity } from "#capacity.ts";
import { makeCodexServers } from "#server.ts";

interface CodexPluginOptions {
	readonly cwd: string;
	readonly skills: string;
}

const APP_SERVER = ["app-server"];

const CONSTRAINED_APP_SERVER = [
	"app-server",
	"-c",
	"features.plugins=false",
	"-c",
	"features.memories=false",
	"-c",
	"features.skip_host_skill_discovery=true",
];

const spawnAppServer = (command: string, cwd: string, args: ReadonlyArray<string>) => (): LineProcess => spawnLineProcess({ args, command, cwd });

const codexCommand = (context: PluginContext) =>
	Effect.flatMap(context.findExecutable("codex"), (found) => (Option.isSome(found) ? Effect.succeed(found) : bundledCodex));

const registerCodex = (context: PluginContext, command: string, options: CodexPluginOptions) =>
	Effect.gen(function* () {
		const capacity = yield* makeBackendCapacityController(classifyCodexCapacity);
		const ordinary = yield* makeCodexServers({
			observeCapacity: capacity.observe,
			skills: skillFolders(options.skills),
			spawn: spawnAppServer(command, options.cwd, APP_SERVER),
		});
		const constrained = yield* makeCodexServers({
			observeCapacity: capacity.observe,
			skills: undefined,
			spawn: spawnAppServer(command, options.cwd, CONSTRAINED_APP_SERVER),
		});
		yield* context.registerAgentBackend(codexBackend({ constrained, ordinary }, capacity.source));
	});

export const codexPlugin = (options: CodexPluginOptions): AntumbraPlugin => ({
	activate: (context) =>
		Effect.flatMap(
			codexCommand(context),
			Option.match({
				onNone: () => Effect.logWarning("codex: no executable found on the login PATH or in the ChatGPT app; backend not registered"),
				onSome: (command) => registerCodex(context, command, options),
			}),
		),
	name: "codex",
});
