import type { PieceView } from "@antumbra/contract";
import { Badge } from "#components/ui/badge.tsx";
import {
	Card,
	CardAction,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#components/ui/card.tsx";
import { PieceActs } from "#views/piece-acts.tsx";
import { PieceOutcomes } from "#views/piece-outcomes.tsx";
import { dependsOnLabel, pieceStateLabel } from "#voyages/labels.ts";
import { pieceTone } from "#voyages/tone.ts";

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

export const PieceCard = ({
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
		<Card className="gap-2">
			<CardHeader>
				<CardTitle className="whitespace-normal wrap-anywhere">
					{piece.title}
				</CardTitle>
				<CardDescription>{piece.role}</CardDescription>
				<CardAction>
					<Badge variant={pieceTone[piece.state]}>
						{pieceStateLabel[piece.state]}
					</Badge>
				</CardAction>
			</CardHeader>
			<p className="min-w-0 text-xs text-muted-foreground wrap-anywhere">
				{piece.charter}
			</p>
			{depends === "" ? null : (
				<p className="min-w-0 text-2xs text-muted-foreground wrap-anywhere">
					{depends}
				</p>
			)}
			<AtWork piece={piece} />
			<PieceOutcomes onError={onError} piece={piece} />
			<PieceActs onError={onError} piece={piece} pieces={pieces} />
		</Card>
	);
};
