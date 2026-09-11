import * as Id from "@antumbra/platform-vocabulary/id.ts";

export const VoyageId = Id.brand("VoyageId");
export type VoyageId = typeof VoyageId.Type;

export const FLAGSHIP_REQUEST = Id.Request.make("voyage:flagship");
