import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const BerthId = Id.brand("BerthId");
export type BerthId = typeof BerthId.Type;

export const berthId = (agentId: string, slug: string): BerthId => BerthId.make(`${agentId}:${slug}`);
