import type { PieceView } from "@antumbra/contract";
import { useState } from "react";
import {
	launchPiece,
	parkPiece,
	rewirePiece,
	unparkPiece,
} from "#adapters/trpc-voyages.ts";
import { Button } from "#components/ui/button.tsx";
import { PiecePicker, pickable } from "#views/piece-picker.tsx";
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
	const [dependsOn, setDependsOn] = useState(piece.dependsOn);
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
		// why: the picker opens on what the piece depends on right now, not on
		// what it depended on when the row was first drawn.
		setDependsOn(piece.dependsOn);
		return setRewiring(!rewiring);
	};
	const rewire = () => {
		rewirePiece({ dependsOn, pieceId: piece.id }, onError);
		setRewiring(false);
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
			{rewiring ? (
				<div className="flex min-w-0 flex-col gap-2 rounded-md border border-border bg-muted p-2">
					<span className="text-2xs font-medium text-muted-foreground">
						Depends on
					</span>
					<PiecePicker
						chosen={dependsOn}
						exclude={piece.id}
						onChange={setDependsOn}
						pieces={pickable(pieces)}
					/>
					<Button
						className="self-start"
						onClick={rewire}
						size="sm"
						type="button"
					>
						Save position
					</Button>
				</div>
			) : null}
		</div>
	);
};
