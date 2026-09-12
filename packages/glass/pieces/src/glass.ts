import type { pieces } from "@antumbra/domain-pieces/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type PiecesGlass = Glass<readonly [typeof pieces]>;

export type PiecesApi = PiecesGlass["api"];
