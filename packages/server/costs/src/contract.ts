import { forAgent as sourceForAgent } from "@antumbra/domain-costs/queries/for-agent.ts";
import { forVoyage as sourceForVoyage } from "@antumbra/domain-costs/queries/for-voyage.ts";
import { reading as sourceReading } from "@antumbra/domain-costs/queries/reading.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const Reading = query("reading", {
	readPolicy: signedIn,
	payload: sourceReading.input,
	success: sourceReading.output,
	reads: () => [
		collection("sessionUsage", Schema.String).list,
		collection("voyageAgent", Schema.String).list,
		collection("voyage", Schema.String).list,
	],
});
export const ForVoyage = query("forVoyage", {
	readPolicy: signedIn,
	payload: sourceForVoyage.input,
	success: sourceForVoyage.output,
	reads: () => [collection("sessionUsage", Schema.String).list, collection("voyageAgent", Schema.String).list],
});
export const ForAgent = query("forAgent", {
	readPolicy: signedIn,
	payload: sourceForAgent.input,
	success: sourceForAgent.output,
	reads: () => [collection("sessionUsage", Schema.String).list],
});
export const CostsContract = contract("costs", { commands: [], queries: [Reading, ForVoyage, ForAgent] });
