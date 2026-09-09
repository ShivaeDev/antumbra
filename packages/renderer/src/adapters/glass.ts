import { roleSettingsGlass } from "@antumbra/glass-role-settings/glass.ts";
import { Effect } from "effect";

export const glass = roleSettingsGlass(Effect.promise(() => window.antumbra.server()));
