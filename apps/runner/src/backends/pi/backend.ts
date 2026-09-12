import { skillFolders } from "@antumbra/platform-skills/folders.ts";
import { piBackend } from "@antumbra/runner-backends-pi/backend.ts";
import { piRuntime } from "#backends/pi/adapters/runtime.ts";

export const makePiBackend = (options: { readonly skills: string }) => piBackend(piRuntime({ skills: skillFolders(options.skills) }));
