import type { PieceView } from "@antumbra/contract";
import { useState } from "react";
import {
	launchPiece,
	parkPiece,
	rewirePiece,
	unparkPiece,
} from "#adapters/trpc-voyages.ts";
import { PiecePicker } from "#views/piece-picker.tsx";
import { buttonStyle, columnStyle, rowStyle } from "#views/styles.ts";
import { actsFor, type PieceAct } from "#voyages/acts.ts";

const ActButton = ({
	act,
	onAct,
}: {
	readonly act: PieceAct;
	readonly onAct: (act: PieceAct) => void;
}) => (
	<button onClick={() => onAct(act)} style={buttonStyle} type="button">
		{act}
	</button>
);

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
		<div style={columnStyle}>
			<div style={rowStyle}>
				{actsFor(piece).map((offered) => (
					<ActButton act={offered} key={offered} onAct={act} />
				))}
			</div>
			{rewiring ? (
				<div style={columnStyle}>
					<PiecePicker
						chosen={dependsOn}
						exclude={piece.id}
						onChange={setDependsOn}
						pieces={pieces}
					/>
					<button onClick={rewire} style={buttonStyle} type="button">
						save position
					</button>
				</div>
			) : null}
		</div>
	);
};
