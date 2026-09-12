import { PieceId } from "@antumbra/domain-pieces/ids.ts";
import { Live } from "@antumbra/glass-client/live.tsx";
import { ChangeChip } from "#change-chip.tsx";
import type { ChangesApi } from "#glass.ts";
export const ChangeOutcomes = ({ api, pieceId }: { readonly api: ChangesApi; readonly pieceId: string }) => (
	<Live query={api.changes.byPiece} input={{ pieceId: PieceId.make(pieceId) }}>
		{(rows) => (
			<div className="flex flex-col gap-1.5">
				{rows.map((row) => (
					<ChangeChip key={row.rowId} change={row} />
				))}
			</div>
		)}
	</Live>
);
