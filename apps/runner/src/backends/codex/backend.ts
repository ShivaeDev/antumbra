import { skillFolders } from "@antumbra/platform-skills/folders.ts";
import { CodexServers, codexBackend } from "@antumbra/runner-backends-codex/backend.ts";
import { classifyCodexCapacity } from "@antumbra/runner-backends-codex/capacity.ts";
import { makeBackendCapacityController } from "@antumbra/runner-ports/backend-capacity.ts";
import { Effect, Option } from "effect";
import { bundledCodex } from "#backends/codex/chatgpt-bundle.ts";
import { spawnLineProcess } from "#backends/codex/process.ts";
import { makeCodexServers } from "#backends/codex/server.ts";

interface CodexBackendOptions {
	readonly command: string;
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

export const codexCommand = (found: Option.Option<string>) => (Option.isSome(found) ? Effect.succeed(found) : bundledCodex);

export const makeCodexBackend = (options: CodexBackendOptions) =>
	Effect.gen(function* () {
		const capacity = yield* makeBackendCapacityController(classifyCodexCapacity);
		const spawn = (args: ReadonlyArray<string>) => () => spawnLineProcess({ args, command: options.command, cwd: options.cwd });
		const ordinary = yield* makeCodexServers({
			observeCapacity: capacity.observe,
			skills: skillFolders(options.skills),
			spawn: spawn(APP_SERVER),
		});
		const constrained = yield* makeCodexServers({
			observeCapacity: capacity.observe,
			skills: undefined,
			spawn: spawn(CONSTRAINED_APP_SERVER),
		});
		return yield* codexBackend.pipe(Effect.provideService(CodexServers, { constrained, ordinary, capacity: capacity.source }));
	});
