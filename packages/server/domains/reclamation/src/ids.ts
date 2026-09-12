import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const BerthId = Id.brand("BerthId");
export type BerthId = typeof BerthId.Type;

export const berthId = (agentId: string, slug: string): BerthId => BerthId.make(`${agentId}:${slug}`);

export const HeldResourceId = Id.brand("HeldResourceId");
export type HeldResourceId = typeof HeldResourceId.Type;

export const heldResourceId = (berth: BerthId, changeId: string): HeldResourceId => HeldResourceId.make(`${berth}/${changeId}`);

export const reclaimRequestId = (requestId: Id.Request, berth: BerthId): Id.Request => Id.Request.make(`${requestId}:${berth}`);
