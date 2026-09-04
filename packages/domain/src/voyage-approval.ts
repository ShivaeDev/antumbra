import type { VoyageApproval } from "@antumbra/rulings";
import { Option } from "effect";
import type { VoyageWorld } from "#voyage-rows.ts";
import { piecesOfVoyage } from "#voyage-state.ts";

export interface StandingApproval {
	readonly approvalId: string;
	readonly pieceIds: ReadonlyArray<string>;
	readonly ruledAt: Date;
}

export interface ApprovalRequest {
	readonly approvalId: string;
	readonly pieceIds: ReadonlyArray<string>;
	readonly requestedAt: Date;
}

const approvalsOf = (world: VoyageWorld, voyageId: string): ReadonlyArray<VoyageApproval> =>
	world.approvals.filter((approval) => approval.voyageId === voyageId);

export const standingApprovalOf = (world: VoyageWorld, voyageId: string): Option.Option<StandingApproval> =>
	Option.fromUndefinedOr(
		approvalsOf(world, voyageId)
			.flatMap(
				(approval): ReadonlyArray<StandingApproval> =>
					approval.ruledAt === null ? [] : [{ approvalId: approval.approvalId, pieceIds: approval.pieceIds, ruledAt: approval.ruledAt }],
			)
			.at(-1),
	);

export const approvalRequestOf = (world: VoyageWorld, voyageId: string): Option.Option<ApprovalRequest> =>
	Option.map(
		Option.fromUndefinedOr(approvalsOf(world, voyageId).find((approval) => approval.ruledAt === null)),
		(approval): ApprovalRequest => ({ approvalId: approval.approvalId, pieceIds: approval.pieceIds, requestedAt: approval.requestedAt }),
	);

export const plotOf = (world: VoyageWorld, voyageId: string): ReadonlyArray<string> =>
	piecesOfVoyage(world, voyageId).filter((pieceId) => {
		const piece = world.pieces.find((row) => row.id === pieceId);
		return piece !== undefined && piece.parkedAt === null && world.pieceVerdicts.get(pieceId) !== "abandoned";
	});
