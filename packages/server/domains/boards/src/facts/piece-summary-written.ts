import { fact } from "@antumbra/platform-feature/fact.ts";
import { PieceSummaryWrittenPayload } from "@antumbra/platform-vocabulary/boards-event.ts";
export const pieceSummaryWritten = fact("PieceSummaryWritten", PieceSummaryWrittenPayload.fields);
