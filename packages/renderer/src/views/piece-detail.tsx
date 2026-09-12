import type { PieceView } from "@antumbra/contract";
import { PieceActs } from "@antumbra/glass-pieces/piece-acts.tsx";
import { RewirePiece } from "@antumbra/glass-pieces/rewire-piece.tsx";
import { useGlass } from "#adapters/glass.ts";
import { Badge } from "#components/ui/badge.tsx";
import { BoardPanel } from "#views/board.tsx";
import { MarkdownView } from "#views/markdown-view.tsx";
import { WorkNowAct } from "#views/piece-acts.tsx";
import { PieceOutcomes } from "#views/piece-outcomes.tsx";
import { PieceRetire } from "#views/piece-retire.tsx";
import { awaitingRulingLabel, dependsOnLabel } from "#voyages/labels.ts";

const AtWork = ({ piece }: { readonly piece: PieceView }) => {
	if (piece.agents.length === 0) {
		return null;
	}
	return (
		<div className="flex min-w-0 flex-wrap gap-1">
			{piece.agents.map((agent) => (
				<Badge key={agent.agentId} variant="outline">
					<span className="font-mono">{agent.agentId.slice(0, 8)}</span>
					<span>· {agent.status}</span>
				</Badge>
			))}
		</div>
	);
};

export const PieceDetail = ({
	onError,
	piece,
	pieces,
	voyageId,
}: {
	readonly onError: (message: string) => void;
	readonly piece: PieceView;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly voyageId: string;
}) => {
	const api = useGlass();
	const depends = dependsOnLabel(piece, pieces);
	return (
		<div className="flex min-w-0 flex-col gap-2 border-t border-border px-2.5 py-2">
			{piece.charter === "" ? null : <MarkdownView className="text-xs" markdown={piece.charter} />}
			{depends === "" ? null : <p className="min-w-0 text-2xs text-muted-foreground wrap-anywhere">{depends}</p>}
			{piece.awaitingRulings.map((ruling) => (
				<p className="min-w-0 truncate text-2xs text-muted-foreground" key={ruling.rulingId} title={awaitingRulingLabel(ruling)}>
					{awaitingRulingLabel(ruling)}
				</p>
			))}
			<AtWork piece={piece} />
			<BoardPanel entries={piece.board} name={piece.title} scope={{ kind: "piece", pieceId: piece.id }} />
			<PieceOutcomes onError={onError} piece={piece} />
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				<PieceActs api={api} piece={piece} />
				<WorkNowAct onError={onError} piece={piece} />
			</div>
			<RewirePiece api={api} piece={{ dependsOn: piece.dependsOn, id: piece.id, title: piece.title, voyageId }} />
			<PieceRetire onError={onError} piece={piece} />
		</div>
	);
};
