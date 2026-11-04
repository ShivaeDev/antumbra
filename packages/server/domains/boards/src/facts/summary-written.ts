import { fact } from "@antumbra/platform-feature/fact.ts";
import { SummaryWrittenPayload } from "@antumbra/platform-vocabulary/boards-event.ts";
export const summaryWritten = fact("SummaryWritten", SummaryWrittenPayload.fields);
