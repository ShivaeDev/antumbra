import { claim as sourceClaim } from "@antumbra/domain-reclamation/commands/claim.ts";
import { failed as sourceFailed } from "@antumbra/domain-reclamation/commands/failed.ts";
import { held as sourceHeld } from "@antumbra/domain-reclamation/commands/held.ts";
import { plan as sourcePlan } from "@antumbra/domain-reclamation/commands/plan.ts";
import { ready as sourceReady } from "@antumbra/domain-reclamation/commands/ready.ts";
import { reclaimed as sourceReclaimed } from "@antumbra/domain-reclamation/commands/reclaimed.ts";
import { berths as sourceBerths } from "@antumbra/domain-reclamation/queries/berths.ts";
import { candidates as sourceCandidates } from "@antumbra/domain-reclamation/queries/candidates.ts";
import { claims as sourceClaims } from "@antumbra/domain-reclamation/queries/claims.ts";
import { current as sourceCurrent } from "@antumbra/domain-reclamation/queries/moorage.ts";
import { retryable as sourceRetryable } from "@antumbra/domain-reclamation/queries/retryable.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const Plan = command("plan", {
	payload: sourcePlan.Input,
	success: Schema.Number,
	rejections: { ...sourcePlan.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Ready = command("ready", {
	payload: sourceReady.Input,
	success: Schema.Number,
	rejections: { ...sourceReady.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Claim = command("claim", {
	payload: sourceClaim.Input,
	success: Schema.Number,
	rejections: { ...sourceClaim.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Reclaimed = command("reclaimed", {
	payload: sourceReclaimed.Input,
	success: Schema.Number,
	rejections: { ...sourceReclaimed.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Held = command("held", {
	payload: sourceHeld.Input,
	success: Schema.Number,
	rejections: { ...sourceHeld.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Failed = command("failed", {
	payload: sourceFailed.Input,
	success: Schema.Number,
	rejections: { ...sourceFailed.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Berths = query("berths", {
	payload: sourceBerths.input,
	success: sourceBerths.output,
	reads: () => [collection("berth", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Current = query("current", {
	payload: sourceCurrent.input,
	success: sourceCurrent.output,
	reads: () => [collection("moorage", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Candidates = query("candidates", {
	payload: sourceCandidates.input,
	success: sourceCandidates.output,
	reads: () => [
		collection("resourceOwner", Schema.String).list,
		collection("moorage", Schema.String).list,
		collection("berth", Schema.String).list,
		collection("heldResource", Schema.String).list,
	],
	readPolicy: () => Effect.succeed(true),
});
export const Claims = query("claims", {
	payload: sourceClaims.input,
	success: sourceClaims.output,
	reads: () => [collection("berth", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Retryable = query("retryable", {
	payload: sourceRetryable.input,
	success: sourceRetryable.output,
	reads: () => [collection("berth", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const ReclamationContract = contract("reclamation", {
	commands: [Plan, Ready, Claim, Reclaimed, Held, Failed],
	queries: [Berths, Current, Candidates, Claims, Retryable],
});
