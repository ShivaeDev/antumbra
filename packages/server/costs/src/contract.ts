import { forAgent as sourceForAgent } from "@antumbra/domain-costs/queries/for-agent.ts";
import { forVoyage as sourceForVoyage } from "@antumbra/domain-costs/queries/for-voyage.ts";
import { reading as sourceReading } from "@antumbra/domain-costs/queries/reading.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const Reading = stream("reading", {
	payload: sourceReading.input,
	success: sourceReading.output,
	reads: () => [
		collection("sessionUsage", Schema.String).list,
		collection("voyageAgent", Schema.String).list,
		collection("voyage", Schema.String).list,
	],
});
export const ForVoyage = stream("forVoyage", {
	payload: sourceForVoyage.input,
	success: sourceForVoyage.output,
	reads: () => [collection("sessionUsage", Schema.String).list, collection("voyageAgent", Schema.String).list],
});
export const ForAgent = stream("forAgent", {
	payload: sourceForAgent.input,
	success: sourceForAgent.output,
	reads: () => [collection("sessionUsage", Schema.String).list],
});
export const CostsContract = contract("costs", { commands: [], streams: [Reading, ForVoyage, ForAgent] });
