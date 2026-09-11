import { skillFolders } from "@antumbra/platform-skills/folders.ts";
import type { AntumbraPlugin } from "@antumbra/plugin-api";
import { piRuntime } from "#adapters/runtime.ts";
import { piBackend } from "#backend.ts";

interface PiPluginOptions {
	readonly skills: string;
}

export const piPlugin = (options: PiPluginOptions): AntumbraPlugin => ({
	activate: (context) => context.registerAgentBackend(piBackend(piRuntime({ skills: skillFolders(options.skills) }))),
	name: "pi",
});
