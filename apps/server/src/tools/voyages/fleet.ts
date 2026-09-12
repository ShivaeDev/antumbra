import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { readFleetView } from "#tools/voyages/fleet-reading.ts";
import { renderFleet } from "#tools/voyages/fleet-render.ts";
import { readFleetSpec } from "#tools/voyages/specs.ts";

export const readFleet = bind(readFleetSpec, (context) => answered(context, readFleetSpec.name, readFleetView(), renderFleet));
