import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { answered, onVoyage } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { readVoyageSpec } from "#tools/voyages/read-spec.ts";
import { readVoyageView } from "#tools/voyages/reading.ts";
import { renderVoyage } from "#tools/voyages/render.ts";

export const readVoyage = bind(readVoyageSpec, (context, input) => {
	const read = (id: string) => answered(context, readVoyageSpec.name, readVoyageView(VoyageId.make(id)), renderVoyage);
	return input.voyageId === undefined ? onVoyage(context, read) : read(input.voyageId);
});
