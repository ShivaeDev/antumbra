import type { PieceView } from "@antumbra/contract";
import { useState } from "react";
import { launchPiece, parkPiece, unparkPiece, workPieceNow } from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { PieceRewire } from "#views/piece-rewire.tsx";
import { actsFor, type PieceAct } from "#voyages/acts.ts";
import { pieceActLabel } from "#voyages/labels.ts";

export const PieceActs = ({
	onError,
	piece,
	pieces,
}: {
	readonly onError: (message: string) => void;
	readonly piece: PieceView;
	readonly pieces: ReadonlyArray<PieceView>;
}) => {
	const [rewiring, setRewiring] = useState(false);
	const act = (chosen: PieceAct) => {
		if (chosen === "launch") {
			return launchPiece(piece.id, onError);
		}
		if (chosen === "park") {
			return parkPiece(piece.id, onError);
		}
		if (chosen === "unpark") {
			return unparkPiece(piece.id, onError);
		}
		if (chosen === "workNow") {
			return workPieceNow(piece.id, onError);
		}
		return setRewiring(!rewiring);
	};
	return (
		<div className="flex min-w-0 flex-col gap-2">
			<div className="flex min-w-0 flex-wrap items-center gap-1.5">
				{actsFor(piece).map((offered) => (
					<Button
						aria-expanded={offered === "rewire" ? rewiring : undefined}
						key={offered}
						onClick={() => act(offered)}
						size="sm"
						type="button"
						variant="outline"
					>
						{pieceActLabel[offered]}
					</Button>
				))}
			</div>
			{rewiring ? <PieceRewire piece={piece} pieces={pieces} onSaved={() => setRewiring(false)} /> : null}
		</div>
	);
};
