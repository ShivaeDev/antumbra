import type { repos } from "@antumbra/domain-repos/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type ReposGlass = Glass<readonly [typeof repos]>;
export type ReposApi = ReposGlass["api"];
