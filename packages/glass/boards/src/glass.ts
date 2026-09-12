import type { boards } from "@antumbra/domain-boards/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type BoardsGlass = Glass<readonly [typeof boards]>;

export type BoardsApi = BoardsGlass["api"];
