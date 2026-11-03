import * as Id from "@antumbra/platform-vocabulary/id.ts";
import { VoyageId as IdSchema } from "@antumbra/platform-vocabulary/voyage.ts";

export const VoyageId = IdSchema;
export type VoyageId = typeof VoyageId.Type;

export const FLAGSHIP_REQUEST = Id.Request.make("voyage:flagship");

export const captainWorkId = (agentId: string, voyageId: VoyageId): string => JSON.stringify([agentId, voyageId]);

export const activityId = (sourceKind: "session" | "change", sourceId: string, voyageId: VoyageId): string =>
	JSON.stringify([sourceKind, sourceId, voyageId]);
