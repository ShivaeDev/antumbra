import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { rejections } from "#commands/guard.ts";
import { rulingWithdrawn } from "#facts/ruling-withdrawn.ts";
import { ruling } from "#rows/ruling.ts";
export const withdraw = command("withdraw", {
	input: { ...rulingWithdrawn.payload, note: titled(rulingWithdrawn.payload.note, { title: "Why", multiline: true }) },
	reads: [ruling],
	emits: rulingWithdrawn,
	rejections: { ...rejections },
});
