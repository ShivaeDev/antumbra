import { command } from "@antumbra/platform-feature/command.ts";
import { restartCleared } from "#facts/restart-cleared.ts";
export const clear = command("clear", { input: {}, reads: [], emits: restartCleared, rejections: {} });
