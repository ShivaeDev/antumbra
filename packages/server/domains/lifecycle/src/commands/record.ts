import { session } from "@antumbra/domain-sessions/rows/session.ts";
import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { restartRecorded } from "#facts/restart-recorded.ts";

export const record = command("record", {
	input: { runnerIds: Schema.Array(Schema.String) },
	reads: [session],
	emits: restartRecorded,
	rejections: {},
});
