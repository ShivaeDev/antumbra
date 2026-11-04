import { fact } from "@antumbra/platform-feature/fact.ts";
import { NoteWrittenPayload } from "@antumbra/platform-vocabulary/boards-event.ts";
export const noteWritten = fact("NoteWritten", NoteWrittenPayload.fields);
