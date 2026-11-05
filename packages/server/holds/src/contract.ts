import { queues as sourceQueues } from "@antumbra/domain-holds/queries/queues.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const Queues = query("queues", {
	readPolicy: signedIn,
	payload: sourceQueues.input,
	success: sourceQueues.output,
	reads: () => [
		collection("piece", Schema.String).list,
		collection("pieceProgress", Schema.String).list,
		collection("voyage", Schema.String).list,
		collection("agent", Schema.String).list,
		collection("pieceAgent", Schema.String).list,
		collection("session", Schema.String).list,
		collection("sessionOperation", Schema.String).list,
		collection("birth", Schema.String).list,
		collection("flag", Schema.String).list,
		collection("message", Schema.String).list,
		collection("agent", Schema.String).list,
		collection("session", Schema.String).list,
		collection("sessionOperation", Schema.String).list,
		collection("count", Schema.String).list,
		collection("voyageAgent", Schema.String).list,
		collection("agentReading", Schema.String).list,
		collection("pieceProgress", Schema.String).list,
		collection("sessionOperation", Schema.String).list,
		collection("count", Schema.String).list,
		collection("flag", Schema.String).list,
		collection("smoothingAttempt", Schema.String).list,
		collection("flag", Schema.String).list,
		collection("voyage", Schema.String).list,
		collection("restart", Schema.String).list,
		collection("flag", Schema.String).list,
		collection("voyageAgent", Schema.String).list,
		collection("voyage", Schema.String).list,
		collection("flag", Schema.String).list,
	],
});
export const HoldsContract = contract("holds", { commands: [], queries: [Queues] });
