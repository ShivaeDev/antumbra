import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { VoyageId } from "@antumbra/domain-voyages/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import type { SessionsApi } from "#glass.ts";

export const AgentWork = (props: {
	readonly api: SessionsApi;
	readonly pieceIds: readonly string[];
	readonly voyageIds: readonly string[];
	readonly onPiece: (voyageId: string, pieceId: string) => void;
	readonly onVoyage: (voyageId: string) => void;
}) => (
	<div className="flex flex-col gap-1">
		{props.pieceIds.map((id) => (
			<Live key={id} query={props.api.pieces.byId} input={{ id: PieceId.make(id) }}>
				{(piece) =>
					piece === null ? null : (
						<button
							className="text-left text-sm font-medium text-link hover:underline"
							type="button"
							onClick={() => props.onPiece(piece.voyageId, piece.id)}
						>
							{piece.title}
						</button>
					)
				}
			</Live>
		))}
		{props.voyageIds.map((id) => (
			<Live key={id} query={props.api.voyages.byId} input={{ id: VoyageId.make(id) }}>
				{(voyage) =>
					voyage === null ? null : (
						<button className="text-left text-xs text-link hover:underline" type="button" onClick={() => props.onVoyage(voyage.id)}>
							{voyage.name}
						</button>
					)
				}
			</Live>
		))}
	</div>
);
