import { fact } from "@antumbra/platform-feature/fact.ts";
import { SmoothingFinishedPayload } from "@antumbra/platform-vocabulary/boards-event.ts";
export const smoothingFinished = fact("SmoothingFinished", SmoothingFinishedPayload.fields);
