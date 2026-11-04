import { fact } from "@antumbra/platform-feature/fact.ts";
import { SmoothingSessionFinishedPayload } from "@antumbra/platform-vocabulary/boards-event.ts";
export const smoothingSessionFinished = fact("SmoothingSessionFinished", SmoothingSessionFinishedPayload.fields);
