import type { PieceView } from "@antumbra/contract";
import { PieceActs } from "#views/piece-acts.tsx";
import { PieceOutcomes } from "#views/piece-outcomes.tsx";
import {
	cardStyle,
	columnStyle,
	headingStyle,
	mutedStyle,
	pillStyle,
	rowStyle,
} from "#views/styles.ts";
import { dependsOnLabel, stateColour } from "#voyages/labels.ts";
import { byLadder } from "#voyages/order.ts";

const PieceRow = ({
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
		<div style={cardStyle}>
			<div style={rowStyle}>
				<strong>{piece.title}</strong>
				<span style={mutedStyle}>{piece.role}</span>
				<span style={pillStyle(stateColour[piece.state])}>{piece.state}</span>
			</div>
			{depends === "" ? null : <span style={mutedStyle}>{depends}</span>}
			{piece.agents.length === 0 ? null : (
				<div style={{ ...rowStyle, flexWrap: "wrap" }}>
					{piece.agents.map((agent) => (
						<span key={agent.agentId} style={mutedStyle}>
							{agent.agentId.slice(0, 8)} · {agent.status}
						</span>
					))}
				</div>
			)}
			<PieceOutcomes piece={piece} />
			<PieceActs onError={onError} piece={piece} pieces={pieces} />
		</div>
	);
};

export const PiecesPanel = ({
	onError,
	pieces,
}: {
	readonly onError: (message: string) => void;
	readonly pieces: ReadonlyArray<PieceView>;
}) => (
	<div style={columnStyle}>
		<h2 style={headingStyle}>pieces</h2>
		{pieces.length === 0 ? (
			<span style={mutedStyle}>nothing chartered yet</span>
		) : null}
		{byLadder(pieces).map((piece) => (
			<PieceRow
				key={piece.id}
				onError={onError}
				piece={piece}
				pieces={pieces}
			/>
		))}
	</div>
);
