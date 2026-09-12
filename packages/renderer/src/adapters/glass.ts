import type { PiecesApi } from "@antumbra/glass-pieces/glass.ts";
import type { RoleSettingsApi } from "@antumbra/glass-role-settings/glass.ts";
import type { SettingsApi } from "@antumbra/glass-settings/glass.ts";
import type { VoyagesApi } from "@antumbra/glass-voyages/glass.ts";
import { Effect } from "effect";
import { createContext, useContext } from "react";

type Api = PiecesApi & RoleSettingsApi & SettingsApi & VoyagesApi;

export const GlassContext = createContext<Api | undefined>(undefined);

export const useGlass = (): Api => {
	const api = useContext(GlassContext);
	return api ?? Effect.runSync(Effect.die("The renderer requires a GlassContext provider"));
};
