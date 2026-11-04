import { row } from "@antumbra/platform-feature/row.ts";
import {
	Agent,
	Berth,
	HeldResource,
	Moorage,
	PieceAgent,
	ResourceOwner,
	VoyageActivity,
	VoyageCaptainWork,
} from "@antumbra/platform-vocabulary/change-evidence.ts";
import {
	AdoptionRequest,
	Change,
	ChangeFeedback,
	ChangeRefresh,
	ChangeTransition,
	ChangeVerdict,
	HostCapability,
	PieceChange,
	PieceChangeView,
	QuayChange,
	SessionSituation,
} from "@antumbra/platform-vocabulary/changes.ts";
import { Piece } from "@antumbra/platform-vocabulary/piece.ts";
import { Session } from "@antumbra/platform-vocabulary/session.ts";
import { Effect } from "effect";
import { rowsOf } from "#postgres/rows.ts";
export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });
const externalpiece = rowsOf(piece, "pieces", "chartered_order");

import { Voyage } from "@antumbra/platform-vocabulary/voyage.ts";
export const voyage = row("voyage", Voyage.fields, { key: "id" });
const externalvoyage = rowsOf(voyage, "voyages", "opened_order");

import { Repo } from "@antumbra/platform-vocabulary/repos.ts";
export const repo = row("repo", Repo.fields, { key: "id" });
const externalrepo = rowsOf(repo, "repo", "storage_order");

import { PieceOutcome } from "@antumbra/platform-vocabulary/piece-evidence.ts";
export const pieceOutcome = row("pieceOutcome", PieceOutcome.fields, { key: "id", scope: "pieceId" });
const externalpieceOutcome = rowsOf(pieceOutcome, "piece_outcomes", "id");
export const pieceChangeView = row("pieceChangeView", PieceChangeView.fields, { key: "rowId", scope: "pieceId" });
export const changeHostCapability = row("changeHostCapability", HostCapability.fields, { key: "host" });
export const sessionSituation = row("sessionSituation", SessionSituation.fields, { key: "id", scope: "sessionId" });
export const changeRefresh = row("changeRefresh", ChangeRefresh.fields, { key: "id" });
export const changeAdoptionRequest = row("changeAdoptionRequest", AdoptionRequest.fields, { key: "id" });
export const session = row("session", Session.fields, { key: "id", scope: "agentId" });
export const quayChange = row("quayChange", QuayChange.fields, { key: "id" });
export const change = row("change", Change.fields, { key: "id", scope: "repoId" });
export const pieceChange = row("pieceChange", PieceChange.fields, { key: "id", scope: "pieceId" });
export const changeTransition = row("changeTransition", ChangeTransition.fields, { key: "id", scope: "changeId" });
export const changeVerdict = row("changeVerdict", ChangeVerdict.fields, { key: "changeId" });
export const changeFeedback = row("changeFeedback", ChangeFeedback.fields, { key: "id", scope: "changeId" });
export const berth = row("berth", Berth.fields, { key: "id", scope: "agentId" });
export const moorage = row("moorage", Moorage.fields, { key: "agentId" });
export const agent = row("agent", Agent.fields, { key: "id" });
export const heldResource = row("heldResource", HeldResource.fields, { key: "id", scope: "berthId" });
export const voyageActivity = row("voyageActivity", VoyageActivity.fields, { key: "id", scope: "voyageId" });
export const pieceAgent = row("pieceAgent", PieceAgent.fields, { key: "id", scope: "pieceId" });
export const rows = Effect.gen(function* () {
	return {
		resourceOwner: yield* rowsOf(resourceOwner, "change_resource_owners"),
		voyageCaptainWork: yield* rowsOf(voyageCaptainWork, "change_captain_work"),
		pieceChangeView: yield* rowsOf(pieceChangeView, "pieceChangeView", "storage_order"),
		changeHostCapability: yield* rowsOf(changeHostCapability, "changeHostCapability", "storage_order"),
		sessionSituation: yield* rowsOf(sessionSituation, "sessionSituation", "storage_order"),
		changeRefresh: yield* rowsOf(changeRefresh, "changeRefresh", "storage_order"),
		changeAdoptionRequest: yield* rowsOf(changeAdoptionRequest, "changeAdoptionRequest", "storage_order"),
		session: yield* rowsOf(session, "change_context_session", "storage_order"),
		quayChange: yield* rowsOf(quayChange, "quayChange", "storage_order"),
		change: yield* rowsOf(change, "change", "storage_order"),
		pieceChange: yield* rowsOf(pieceChange, "pieceChange", "storage_order"),
		changeTransition: yield* rowsOf(changeTransition, "changeTransition", "storage_order"),
		changeVerdict: yield* rowsOf(changeVerdict, "changeVerdict", "storage_order"),
		changeFeedback: yield* rowsOf(changeFeedback, "changeFeedback", "storage_order"),
		berth: yield* rowsOf(berth, "change_context_berth", "storage_order"),
		moorage: yield* rowsOf(moorage, "change_context_moorage", "storage_order"),
		agent: yield* rowsOf(agent, "change_context_agent", "storage_order"),
		heldResource: yield* rowsOf(heldResource, "heldResource", "storage_order"),
		voyageActivity: yield* rowsOf(voyageActivity, "change_context_voyageActivity", "storage_order"),
		pieceAgent: yield* rowsOf(pieceAgent, "change_context_pieceAgent", "storage_order"),
		voyage: yield* externalvoyage,
		piece: yield* externalpiece,
		repo: yield* externalrepo,
		pieceOutcome: yield* externalpieceOutcome,
	};
});

export const voyageCaptainWork = row("voyageCaptainWork", VoyageCaptainWork.fields, { key: "id", scope: "voyageId" });

export const resourceOwner = row("resourceOwner", ResourceOwner.fields, { key: "agentId" });
