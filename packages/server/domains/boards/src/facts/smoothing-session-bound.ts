import { fact } from "@antumbra/platform-feature/fact.ts";
import { SmoothingSessionBoundPayload } from "@antumbra/platform-vocabulary/boards-event.ts";
export const smoothingSessionBound = fact("SmoothingSessionBound", SmoothingSessionBoundPayload.fields);
