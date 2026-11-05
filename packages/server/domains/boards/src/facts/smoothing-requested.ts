import { fact } from "@antumbra/platform-feature/fact.ts";
import { BoardSmoothingRequestedPayload } from "@antumbra/platform-vocabulary/boards-event.ts";
export const smoothingRequested = fact("BoardSmoothingRequested", BoardSmoothingRequestedPayload.fields);
