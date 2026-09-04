import { bind, requestApprovalSpec } from "@antumbra/agent-tools";
import type { DirectTool } from "@antumbra/plugin-api";
import { type Ruling, Rulings } from "@antumbra/rulings";
import { Effect } from "effect";
import { answered, onVoyage } from "#tool-answers.ts";
import type { SessionIdentity } from "#tool-identity.ts";
import { plotOf } from "#voyage-approval.ts";
import { VoyageWorldSource } from "#voyage-world.ts";

const asked = (approval: Ruling): string =>
	`approval ${approval.id} requested for ${approval.approvedPieceIds.length} piece(s) — the admiral answers with approve or redirect, and the answer reaches you as mail`;

export const makeApprovalToolCompiler = Effect.gen(function* () {
	const rulings = yield* Rulings;
	const world = yield* VoyageWorldSource;
	const request = (identity: SessionIdentity, voyageId: string, context: string) =>
		world.read.pipe(
			Effect.flatMap((rows) =>
				rulings.requestApproval({
					context,
					pieceIds: plotOf(rows, voyageId),
					requesterAgentId: identity.agentId,
					voyageId,
				}),
			),
		);
	return (identity: SessionIdentity): ReadonlyArray<DirectTool> => [
		bind(requestApprovalSpec, (input) =>
			onVoyage(identity, (voyageId) => answered(identity, requestApprovalSpec.name, request(identity, voyageId, input.context), asked)),
		),
	];
});
