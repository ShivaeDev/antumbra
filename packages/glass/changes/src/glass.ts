import type { changes } from "@antumbra/domain-changes/feature.ts";
import type { quayChange } from "@antumbra/domain-changes/rows/quay-change.ts";
import type { pieces } from "@antumbra/domain-pieces/feature.ts";
import type { repos } from "@antumbra/domain-repos/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";
export type ChangesGlass = Glass<readonly [typeof changes, typeof pieces, typeof repos]>;
export type ChangesApi = ChangesGlass["api"];
export type QuayChange = typeof quayChange.Row.Type;
export type QuayGroup = QuayChange["group"];
