import { all as sourceAll } from "@antumbra/domain-agents/queries/all.ts";
import { authority as sourceAuthority } from "@antumbra/domain-agents/queries/authority.ts";
import { byId as sourceById } from "@antumbra/domain-agents/queries/by-id.ts";
import { byPiece as sourceByPiece } from "@antumbra/domain-agents/queries/by-piece.ts";
import { bySession as sourceBySession } from "@antumbra/domain-agents/queries/by-session.ts";
import { byVoyage as sourceByVoyage } from "@antumbra/domain-agents/queries/by-voyage.ts";
import { canRetireCrew as sourceCanRetireCrew } from "@antumbra/domain-agents/queries/can-retire-crew.ts";
import { captain as sourceCaptain } from "@antumbra/domain-agents/queries/captain.ts";
import { captain as sourceCaptainReading } from "@antumbra/domain-agents/queries/captain-reading.ts";
import { reading as sourceReading } from "@antumbra/domain-agents/queries/reading.ts";
import { roster as sourceRoster } from "@antumbra/domain-agents/queries/roster.ts";
import { smoother as sourceSmoother } from "@antumbra/domain-agents/queries/smoother.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { stream } from "@shivaedev/contract/operation.ts";
import { Schema } from "effect";
export const CanRetireCrew = stream("canRetireCrew", {
	payload: sourceCanRetireCrew.input,
	success: sourceCanRetireCrew.output,
	reads: () => [
		collection("pieceProgress", Schema.String).list,
		collection("agent", Schema.String).list,
		collection("pieceAgent", Schema.String).list,
		collection("session", Schema.String).list,
	],
});
export const Smoother = stream("smoother", {
	payload: sourceSmoother.input,
	success: sourceSmoother.output,
	reads: () => [collection("agent", Schema.String).list, collection("voyageAgent", Schema.String).list],
});
export const CaptainReading = stream("captainReading", {
	payload: sourceCaptainReading.input,
	success: sourceCaptainReading.output,
	reads: () => [collection("captainReading", Schema.String).list],
});
export const ByVoyage = stream("byVoyage", {
	payload: sourceByVoyage.input,
	success: sourceByVoyage.output,
	reads: () => [collection("agentReading", Schema.String).list],
});
export const ByPiece = stream("byPiece", {
	payload: sourceByPiece.input,
	success: sourceByPiece.output,
	reads: () => [collection("agentReading", Schema.String).list],
});
export const Roster = stream("roster", {
	payload: sourceRoster.input,
	success: sourceRoster.output,
	reads: () => [collection("agentReading", Schema.String).list],
});
export const Reading = stream("reading", {
	payload: sourceReading.input,
	success: sourceReading.output,
	reads: () => [collection("agentReading", Schema.String).list],
});
export const BySession = stream("bySession", {
	payload: sourceBySession.input,
	success: sourceBySession.output,
	reads: () => [collection("agentReading", Schema.String).list],
});
export const All = stream("all", {
	payload: sourceAll.input,
	success: sourceAll.output,
	reads: () => [collection("agent", Schema.String).list],
});
export const ById = stream("byId", {
	payload: sourceById.input,
	success: sourceById.output,
	reads: () => [collection("agent", Schema.String).list],
});
export const Captain = stream("captain", {
	payload: sourceCaptain.input,
	success: sourceCaptain.output,
	reads: () => [
		collection("agent", Schema.String).list,
		collection("pieceAgent", Schema.String).list,
		collection("voyageAgent", Schema.String).list,
		collection("session", Schema.String).list,
	],
});
export const Authority = stream("authority", {
	payload: sourceAuthority.input,
	success: sourceAuthority.output,
	reads: () => [collection("voyageAgent", Schema.String).list, collection("voyage", Schema.String).list],
});
