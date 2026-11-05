import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
import { session } from "#rows/session.ts";

export const toolCalled = fact("SessionToolCalled", { sessionId: SessionId, callId: Schema.String, name: Schema.String, input: Schema.String });
export const callTool = command("callTool", {
	input: toolCalled.payload,
	reads: [session],
	emits: toolCalled,
	rejections: {},
});
