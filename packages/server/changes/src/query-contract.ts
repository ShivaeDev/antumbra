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
import { Effect, Schema } from "effect";
export const ByPiece = query("byPiece", {
	payload: byPiece.input,
	success: byPiece.output,
	reads: () => [collection("pieceChangeView", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const HostCapabilities = query("hostCapabilities", {
	payload: hostCapabilities.input,
	success: hostCapabilities.output,
	reads: () => [collection("changeHostCapability", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Browse = query("browse", {
	payload: browse.input,
	success: browse.output,
	reads: () => [collection("quayChange", Schema.String).list, collection("repo", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const SessionSituations = query("sessionSituations", {
	payload: sessionSituations.input,
	success: sessionSituations.output,
	reads: () => [collection("sessionSituation", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Adoptions = query("adoptions", {
	payload: adoptions.input,
	success: adoptions.output,
	reads: () => [collection("changeAdoptionRequest", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const World = query("world", {
	payload: world.input,
	success: world.output,
	reads: () => [
		collection("changeRefresh", Schema.String).list,
		collection("change", Schema.String).list,
		collection("repo", Schema.String).list,
		collection("berth", Schema.String).list,
	],
	readPolicy: () => Effect.succeed(true),
});
export const Quay = query("quay", {
	payload: quay.input,
	success: quay.output,
	reads: () => [collection("quayChange", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const All = query("all", {
	payload: all.input,
	success: all.output,
	reads: () => [collection("change", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Links = query("links", {
	payload: links.input,
	success: links.output,
	reads: () => [collection("pieceChange", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Watchable = query("watchable", {
	payload: watchable.input,
	success: watchable.output,
	reads: () => [collection("change", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Publishing = query("publishing", {
	payload: publishing.input,
	success: publishing.output,
	reads: () => [collection("change", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const Archivable = query("archivable", {
	payload: archivable.input,
	success: archivable.output,
	reads: () => [collection("change", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const CleanupCandidates = query("cleanupCandidates", {
	payload: candidates.input,
	success: candidates.output,
	reads: () => ["resourceOwner", "moorage", "berth", "heldResource"].map((name) => collection(name, Schema.String).list),
	readPolicy: () => Effect.succeed(true),
});
