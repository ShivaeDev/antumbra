import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { rejections } from "#commands/guard.ts";
import { rulingParked } from "#facts/ruling-parked.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const park = command("park", {
	input: { ...rulingParked.payload, note: titled(rulingParked.payload.note, { title: "Not now", multiline: true }) },
	reads: [ruling],
	emits: rulingParked,
	rejections: { ...rejections, AlreadyParked: { rulingId: RulingId } },
});
