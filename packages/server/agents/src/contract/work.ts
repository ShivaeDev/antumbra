import { admitted as sourceAdmitted } from "@antumbra/domain-agents/queries/admitted.ts";
import { birthBySession as sourceBirthBySession } from "@antumbra/domain-agents/queries/birth-by-session.ts";
import { births as sourceBirths } from "@antumbra/domain-agents/queries/births.ts";
import { dispatch as sourceDispatch } from "@antumbra/domain-agents/queries/dispatch.ts";
import { pending as sourcePending } from "@antumbra/domain-agents/queries/pending.ts";
import { pendingOperations as sourcePendingOperations } from "@antumbra/domain-agents/queries/pending-operations.ts";
import { rest as sourceRest } from "@antumbra/domain-agents/queries/rest.ts";
import { workingCount as sourceWorkingCount } from "@antumbra/domain-agents/queries/working-count.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const Rest = query("rest", {
	readPolicy: signedIn,
	payload: sourceRest.input,
	success: sourceRest.output,
	reads: () => [
		collection("agentReading", Schema.String).list,
		collection("pieceProgress", Schema.String).list,
		collection("sessionOperation", Schema.String).list,
		collection("count", Schema.String).list,
		collection("flag", Schema.String).list,
	],
});
export const WorkingCount = query("workingCount", {
	readPolicy: signedIn,
	payload: sourceWorkingCount.input,
	success: sourceWorkingCount.output,
	reads: () => [collection("agentReading", Schema.String).list],
});
export const Births = query("births", {
	readPolicy: signedIn,
	payload: sourceBirths.input,
	success: sourceBirths.output,
	reads: () => [collection("birth", Schema.String).list],
});
export const BirthBySession = query("birthBySession", {
	readPolicy: signedIn,
	payload: sourceBirthBySession.input,
	success: sourceBirthBySession.output,
	reads: () => [collection("birth", Schema.String).list],
});
export const Dispatch = query("dispatch", {
	readPolicy: signedIn,
	payload: sourceDispatch.input,
	success: sourceDispatch.output,
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
	],
});
export const Pending = query("pending", {
	readPolicy: signedIn,
	payload: sourcePending.input,
	success: sourcePending.output,
	reads: () => [
		collection("pieceProgress", Schema.String).list,
		collection("birth", Schema.String).list,
		collection("agent", Schema.String).list,
		collection("capacity", Schema.String).list,
		collection("session", Schema.String).list,
		collection("count", Schema.String).list,
		collection("flag", Schema.String).list,
		collection("roleSetting", Schema.String).list,
		collection("backendModel", Schema.String).list,
		collection("backendCatalog", Schema.String).list,
		collection("voyage", Schema.String).list,
	],
});
export const PendingOperations = query("pendingOperations", {
	readPolicy: signedIn,
	payload: sourcePendingOperations.input,
	success: sourcePendingOperations.output,
	reads: () => [
		collection("sessionOperation", Schema.String).list,
		collection("flag", Schema.String).list,
		collection("session", Schema.String).list,
		collection("voyageAgent", Schema.String).list,
		collection("voyage", Schema.String).list,
	],
});
export const Admitted = query("admitted", {
	readPolicy: signedIn,
	payload: sourceAdmitted.input,
	success: sourceAdmitted.output,
	reads: () => [collection("birth", Schema.String).list, collection("sessionOpening", Schema.String).list, collection("voyage", Schema.String).list],
});
