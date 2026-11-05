import { command } from "@antumbra/platform-feature/command.ts";
import { lineageInput, lineageRejections } from "#commands/lineage.ts";
import { artifactSupersessionRemoved } from "#facts/supersession-removed.ts";
import { artifact } from "#rows/artifact.ts";
export const removeSupersession = command("removeSupersession", {
	input: lineageInput,
	reads: [artifact],
	emits: artifactSupersessionRemoved,
	rejections: lineageRejections,
});
