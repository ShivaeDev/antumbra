import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { answered } from "@antumbra/platform-tool-schemas/answers.ts";
import { bind } from "@antumbra/platform-tool-schemas/define.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { hail } from "#starts/hail.ts";
import { hailCaptainSpec } from "#tools/voyages/specs.ts";

export const hailCaptain = bind(hailCaptainSpec, (context, input) =>
	answered(
		context,
		hailCaptainSpec.name,
		hail({ requestId: requestId(context), voyageId: VoyageId.make(input.voyageId) }),
		(captain) => `hailed captain ${captain.agentId} of voyage ${input.voyageId} — intent ${captain.requestId}`,
	),
);
