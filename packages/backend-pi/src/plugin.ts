import type { AntumbraPlugin } from "@antumbra/plugin-api";
import { skillFolders } from "@antumbra/skills";
import { piRuntime } from "#adapters/runtime.ts";
import { piBackend } from "#backend.ts";

interface PiPluginOptions {
	readonly skills: string;
}

// pi runs inside this process, so there is no executable to find and nothing to register conditionally.
export const piPlugin = (options: PiPluginOptions): AntumbraPlugin => ({
	activate: (context) => context.registerAgentBackend(piBackend(piRuntime({ skills: skillFolders(options.skills) }))),
	name: "pi",
});
