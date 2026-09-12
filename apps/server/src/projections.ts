import { assignments } from "@antumbra/domain-agents/materializers/assignments.ts";
import { captainReadings } from "@antumbra/domain-agents/materializers/captain-readings.ts";
import { captains } from "@antumbra/domain-agents/materializers/captains.ts";
import { roster } from "@antumbra/domain-agents/materializers/roster.ts";
import { running } from "@antumbra/domain-agents/materializers/running.ts";
import { sessionActivity } from "@antumbra/domain-agents/materializers/session-activity.ts";
import { agentWork } from "@antumbra/domain-agents/materializers/work.ts";
import { outcomes } from "@antumbra/domain-changes/materializers/outcomes.ts";
import { pieceChangesProjection } from "@antumbra/domain-changes/materializers/piece-changes.ts";
import { quayProjection } from "@antumbra/domain-changes/materializers/quay.ts";
import { repositoryCleanup } from "@antumbra/domain-changes/materializers/repository-cleanup.ts";
import { sessionSituationsProjection } from "@antumbra/domain-changes/materializers/session-situations.ts";
import { pieceProgressProjection } from "@antumbra/domain-pieces/materializers/progress.ts";
import { rulingDisplayProjection } from "@antumbra/domain-rulings/materializers/display.ts";
import { voyageProgressProjection } from "@antumbra/domain-voyages/materializers/progress.ts";

export const projections = [
	repositoryCleanup,
	outcomes,
	quayProjection,
	agentWork,
	assignments,
	pieceChangesProjection,
	sessionSituationsProjection,
	sessionActivity,
	captains,
	running,
	pieceProgressProjection,
	voyageProgressProjection,
	rulingDisplayProjection,
	roster,
	captainReadings,
] as const;
