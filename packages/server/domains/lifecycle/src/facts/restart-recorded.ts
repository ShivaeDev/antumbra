import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
export const restartRecorded = fact("RestartRecorded", { sessionIds: Schema.Array(SessionId) });
