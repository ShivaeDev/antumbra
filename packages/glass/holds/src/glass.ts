import type { holds } from "@antumbra/domain-holds/feature.ts";
import type { settings } from "@antumbra/domain-settings/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";
export type HoldsApi = Glass<readonly [typeof holds, typeof settings]>["api"];
