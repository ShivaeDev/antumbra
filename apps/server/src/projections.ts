import { assignments } from "@antumbra/domain-agents/projections/assignments.ts";
import { captainReadings } from "@antumbra/domain-agents/projections/captain-readings.ts";
import { captains } from "@antumbra/domain-agents/projections/captains.ts";
import { roster } from "@antumbra/domain-agents/projections/roster.ts";
import { agentWork } from "@antumbra/domain-agents/projections/work.ts";
import { outcomes } from "@antumbra/domain-changes/materializers/outcomes.ts";
import { quayProjection } from "@antumbra/domain-changes/materializers/quay.ts";
import { repositoryCleanup } from "@antumbra/domain-changes/materializers/repository-cleanup.ts";
import { pieceProgressProjection } from "@antumbra/domain-pieces/materializers/progress.ts";
import { rulingDisplayProjection } from "@antumbra/domain-rulings/display.ts";
import { running } from "@antumbra/domain-starts/projections/running.ts";
import { voyageProgressProjection } from "@antumbra/domain-voyages/materializers/progress.ts";

export const projections = [
	repositoryCleanup,
	outcomes,
	quayProjection,
	agentWork,
	assignments,
	captains,
	running,
	pieceProgressProjection,
	voyageProgressProjection,
	rulingDisplayProjection,
	roster,
	captainReadings,
] as const;
