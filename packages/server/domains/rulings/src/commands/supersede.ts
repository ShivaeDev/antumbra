import { command } from "@antumbra/platform-feature/command.ts";
import { choice, titled } from "@antumbra/platform-feature/edit.ts";
import { rejections } from "#commands/guard.ts";
import { rulingSuperseded } from "#facts/ruling-superseded.ts";
import { RulingId } from "#ids.ts";
import { replacements } from "#queries/replacements.ts";
import { ruling } from "#rows/ruling.ts";
export const supersede = command("supersede", {
	input: {
		...rulingSuperseded.payload,
		byRulingId: titled(choice(replacements, { input: { rulingId: "rulingId" }, value: "id", label: "question" }), { title: "Replaced by" }),
	},
	reads: [ruling],
	emits: rulingSuperseded,
	rejections: { ...rejections, Self: { rulingId: RulingId } },
});
