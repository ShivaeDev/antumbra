import type { pieces } from "@antumbra/domain-pieces/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";
import type { BoardsApi } from "#glass.ts";

export type BoardDisplayApi = BoardsApi & Glass<readonly [typeof pieces]>["api"];
