import { row } from "@antumbra/platform-feature/row.ts";
import { SmoothingSession } from "@antumbra/platform-vocabulary/boards.ts";
export const smoothingSession = row("smoothingSession", SmoothingSession.fields, { key: "sessionId", scope: "attemptId" });
