import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { RestartId } from "#ids.ts";

export const restart = row("restart", { id: RestartId, sessionIds: Schema.Array(SessionId) }, { key: "id" });
