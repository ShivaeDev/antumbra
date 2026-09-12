import { repositoryCleanup } from "@antumbra/domain-changes/projections/repository-cleanup.ts";
import { outcomes } from "@antumbra/domain-changes/projections/outcomes.ts";
import { quayProjection } from "@antumbra/domain-changes/projections/quay.ts";
import { agentWork } from "@antumbra/domain-agents/projections/work.ts";
import { assignments } from "@antumbra/domain-agents/projections/assignments.ts";
import { captains } from "@antumbra/domain-agents/projections/captains.ts";
import { running } from "@antumbra/domain-starts/projections/running.ts";
import { pieceProgressProjection } from "@antumbra/domain-pieces/projections/progress.ts";
import { voyageProgressProjection } from "@antumbra/domain-voyages/projections/progress.ts";
import { rulingDisplayProjection } from "@antumbra/domain-rulings/display.ts";

export const projections = [repositoryCleanup, outcomes, quayProjection, agentWork, assignments, captains, running, pieceProgressProjection, voyageProgressProjection, rulingDisplayProjection] as const;
