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
import { Records } from "#records.ts";
export const piece = row("piece", Piece.fields, { key: "id", scope: "voyageId" });

import { Voyage } from "@antumbra/platform-vocabulary/voyage.ts";
export const voyage = row("voyage", Voyage.fields, { key: "id" });

import { Repo } from "@antumbra/platform-vocabulary/repos.ts";
export const repo = row("repo", Repo.fields, { key: "id" });

import { PieceOutcome } from "@antumbra/platform-vocabulary/piece-evidence.ts";
export const pieceOutcome = row("pieceOutcome", PieceOutcome.fields, { key: "id", scope: "pieceId" });
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
export const rows = Records;

export const voyageCaptainWork = row("voyageCaptainWork", VoyageCaptainWork.fields, { key: "id", scope: "voyageId" });

export const resourceOwner = row("resourceOwner", ResourceOwner.fields, { key: "agentId" });
