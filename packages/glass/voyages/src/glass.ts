import type { backends } from "@antumbra/domain-backends/feature.ts";
import type { voyages } from "@antumbra/domain-voyages/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type VoyagesGlass = Glass<readonly [typeof voyages, typeof backends]>;

export type VoyagesApi = VoyagesGlass["api"];
