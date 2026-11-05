import { hostCapabilities } from "@antumbra/domain-changes/commands/host-capability.ts";
import { adoptions } from "@antumbra/domain-changes/queries/adoptions.ts";
import { all } from "@antumbra/domain-changes/queries/all.ts";
import { archivable } from "@antumbra/domain-changes/queries/archivable.ts";
import { browse } from "@antumbra/domain-changes/queries/browse.ts";
import { byPiece } from "@antumbra/domain-changes/queries/by-piece.ts";
import { links } from "@antumbra/domain-changes/queries/links.ts";
import { publishing } from "@antumbra/domain-changes/queries/publishing.ts";
import { quay } from "@antumbra/domain-changes/queries/quay.ts";
import { sessionSituations } from "@antumbra/domain-changes/queries/session-situations.ts";
import { watchable } from "@antumbra/domain-changes/queries/watchable.ts";
import { world } from "@antumbra/domain-changes/queries/world.ts";
import { candidates } from "@antumbra/domain-reclamation/queries/candidates.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { query } from "@shivaedev/contract/operation.ts";
import { signedIn } from "@shivaedev/contract/readPolicy.ts";
import { Schema } from "effect";
export const ByPiece = query("byPiece", {
	readPolicy: signedIn,
	payload: byPiece.input,
	success: byPiece.output,
	reads: () => [collection("pieceChangeView", Schema.String).list],
});
export const HostCapabilities = query("hostCapabilities", {
	readPolicy: signedIn,
	payload: hostCapabilities.input,
	success: hostCapabilities.output,
	reads: () => [collection("changeHostCapability", Schema.String).list],
});
export const Browse = query("browse", {
	readPolicy: signedIn,
	payload: browse.input,
	success: browse.output,
	reads: () => [collection("quayChange", Schema.String).list, collection("repo", Schema.String).list],
});
export const SessionSituations = query("sessionSituations", {
	readPolicy: signedIn,
	payload: sessionSituations.input,
	success: sessionSituations.output,
	reads: () => [collection("sessionSituation", Schema.String).list],
});
export const Adoptions = query("adoptions", {
	readPolicy: signedIn,
	payload: adoptions.input,
	success: adoptions.output,
	reads: () => [collection("changeAdoptionRequest", Schema.String).list],
});
export const World = query("world", {
	readPolicy: signedIn,
	payload: world.input,
	success: world.output,
	reads: () => [
		collection("changeRefresh", Schema.String).list,
		collection("change", Schema.String).list,
		collection("repo", Schema.String).list,
		collection("berth", Schema.String).list,
	],
});
export const Quay = query("quay", {
	readPolicy: signedIn,
	payload: quay.input,
	success: quay.output,
	reads: () => [collection("quayChange", Schema.String).list],
});
export const All = query("all", {
	readPolicy: signedIn,
	payload: all.input,
	success: all.output,
	reads: () => [collection("change", Schema.String).list],
});
export const Links = query("links", {
	readPolicy: signedIn,
	payload: links.input,
	success: links.output,
	reads: () => [collection("pieceChange", Schema.String).list],
});
export const Watchable = query("watchable", {
	readPolicy: signedIn,
	payload: watchable.input,
	success: watchable.output,
	reads: () => [collection("change", Schema.String).list],
});
export const Publishing = query("publishing", {
	readPolicy: signedIn,
	payload: publishing.input,
	success: publishing.output,
	reads: () => [collection("change", Schema.String).list],
});
export const Archivable = query("archivable", {
	readPolicy: signedIn,
	payload: archivable.input,
	success: archivable.output,
	reads: () => [collection("change", Schema.String).list],
});
export const CleanupCandidates = query("cleanupCandidates", {
	readPolicy: signedIn,
	payload: candidates.input,
	success: candidates.output,
	reads: () => ["resourceOwner", "moorage", "berth", "heldResource"].map((name) => collection(name, Schema.String).list),
});
