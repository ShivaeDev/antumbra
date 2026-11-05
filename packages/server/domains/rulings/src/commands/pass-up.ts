import { command } from "@antumbra/platform-feature/command.ts";
import { Schema } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingPassedUp } from "#facts/ruling-passed-up.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const passUp = command("passUp", {
	input: rulingPassedUp.payload,
	reads: [ruling],
	emits: rulingPassedUp,
	rejections: { ...rejections, NotAtRung: { rulingId: RulingId, rung: Schema.NullOr(Schema.String) } },
});
