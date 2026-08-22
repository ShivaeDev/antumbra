import type { PieceView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import { BoardPanel } from "#views/board.tsx";
import { MarkdownView } from "#views/markdown-view.tsx";
import { PieceActs } from "#views/piece-acts.tsx";
import { PieceOutcomes } from "#views/piece-outcomes.tsx";
import { dependsOnLabel } from "#voyages/labels.ts";

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

// why: a charter is what a captain wrote for this piece, Markdown and all, so
// an opened card reads it as the document it is rather than as a paragraph
// with its marks still showing.
export const PieceDetail = ({
	onError,
	piece,
	pieces,
}: {
	readonly onError: (message: string) => void;
	readonly piece: PieceView;
	readonly pieces: ReadonlyArray<PieceView>;
}) => {
	const depends = dependsOnLabel(piece, pieces);
	return (
		<div className="flex min-w-0 flex-col gap-2 border-t border-border px-2.5 py-2">
			{piece.charter === "" ? null : (
				<MarkdownView className="text-xs" markdown={piece.charter} />
			)}
			{depends === "" ? null : (
				<p className="min-w-0 text-2xs text-muted-foreground wrap-anywhere">
					{depends}
				</p>
			)}
			<AtWork piece={piece} />
			<BoardPanel
				entries={piece.board}
				onError={onError}
				scope={{ kind: "piece", pieceId: piece.id }}
			/>
			<PieceOutcomes onError={onError} piece={piece} />
			<PieceActs onError={onError} piece={piece} pieces={pieces} />
		</div>
	);
};
