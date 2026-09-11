import { consoleGlass } from "@antumbra/glass-role-settings/glass.ts";
import { Effect } from "effect";

export const glass = consoleGlass(Effect.promise(() => window.antumbra.server()));
