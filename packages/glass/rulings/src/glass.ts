import type { rulings } from "@antumbra/domain-rulings/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";
export type RulingsGlass = Glass<readonly [typeof rulings]>;
export type RulingsApi = RulingsGlass["api"];
