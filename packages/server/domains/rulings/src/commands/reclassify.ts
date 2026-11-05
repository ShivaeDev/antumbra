import { command } from "@antumbra/platform-feature/command.ts";
import { optional, titled } from "@antumbra/platform-feature/edit.ts";
import { RulingRadiusSchema, RulingUrgencySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { Schema } from "effect";
import { rejections } from "#commands/guard.ts";
import { rulingReclassified } from "#facts/ruling-reclassified.ts";
import { RulingId } from "#ids.ts";
import { ruling } from "#rows/ruling.ts";
export const reclassify = command("reclassify", {
	input: {
		...rulingReclassified.payload,
		radius: optional(RulingRadiusSchema, { title: "Radius" }),
		urgency: optional(RulingUrgencySchema, { title: "Urgency" }),
		note: optional(titled(Schema.String, { title: "Why", multiline: true }), { title: "Why" }),
	},
	reads: [ruling],
	emits: rulingReclassified,
	rejections: { ...rejections, Empty: { rulingId: RulingId } },
});
