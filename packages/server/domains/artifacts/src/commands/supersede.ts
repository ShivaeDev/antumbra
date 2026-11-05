import { command } from "@antumbra/platform-feature/command.ts";
import { lineageInput, lineageRejections } from "#commands/lineage.ts";
import { artifactSuperseded } from "#facts/superseded.ts";
import { artifact } from "#rows/artifact.ts";
export const supersede = command("supersede", {
	input: lineageInput,
	reads: [artifact],
	emits: artifactSuperseded,
	rejections: lineageRejections,
});
