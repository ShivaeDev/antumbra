import type { AntumbraPlugin } from "@antumbra/plugin-api";
import { skillFolders } from "@antumbra/skills/folders.ts";
import { piRuntime } from "#adapters/runtime.ts";
import { piBackend } from "#backend.ts";

interface PiPluginOptions {
	readonly skills: string;
}

export const piPlugin = (options: PiPluginOptions): AntumbraPlugin => ({
	activate: (context) => context.registerAgentBackend(piBackend(piRuntime({ skills: skillFolders(options.skills) }))),
	name: "pi",
});
