import type { VoyageView } from "@antumbra/contract";
import { hailCaptain } from "#adapters/trpc-voyages.ts";
import {
	buttonStyle,
	columnStyle,
	mutedStyle,
	pillStyle,
	rowStyle,
} from "#views/styles.ts";
import { captainAtWork } from "#voyages/acts.ts";
import {
	captainCallLabel,
	voyageStateColour,
	voyageStateLabel,
} from "#voyages/labels.ts";

const CaptainLine = ({
	onError,
	voyage,
}: {
	readonly onError: (message: string) => void;
	readonly voyage: VoyageView;
}) => {
	const captain = voyage.captain;
	if (!captainAtWork(captain)) {
		return (
			<button
				onClick={() => hailCaptain(voyage.id, onError)}
				style={buttonStyle}
				type="button"
			>
				{captainCallLabel(captain)}
			</button>
		);
	}
	return (
		<span style={mutedStyle}>
			captain {captain.agentId.slice(0, 8)} · {captain.status}
		</span>
	);
};

export const VoyageHeader = ({
	onError,
	voyage,
}: {
	readonly onError: (message: string) => void;
	readonly voyage: VoyageView;
}) => (
	<header style={columnStyle}>
		<div style={rowStyle}>
			<h1 style={{ fontSize: "1.1rem", margin: 0 }}>{voyage.name}</h1>
			<span style={pillStyle(voyageStateColour[voyage.state])}>
				{voyageStateLabel[voyage.state]}
			</span>
			<CaptainLine onError={onError} voyage={voyage} />
		</div>
		<span style={{ color: "#c9c6bf" }}>★ {voyage.northStar}</span>
		{voyage.context === "" ? null : (
			<span style={{ ...mutedStyle, whiteSpace: "pre-wrap" }}>
				{voyage.context}
			</span>
		)}
	</header>
);
