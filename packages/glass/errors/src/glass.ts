import type { supervision } from "@antumbra/domain-supervision/feature.ts";
import type { Glass } from "@antumbra/glass-client/connect.ts";

export type ErrorsApi = Glass<readonly [typeof supervision]>["api"];
