import type { VoyageSummary } from "@antumbra/contract";
import { focusVoyage, hailCaptain } from "#adapters/trpc-voyages.ts";
import {
	buttonStyle,
	cardStyle,
	columnStyle,
	ellipsisStyle,
	mutedStyle,
	pillStyle,
	quietButtonStyle,
	rowStyle,
} from "#views/styles.ts";
import { captainAtWork } from "#voyages/acts.ts";
import {
	captainCallLabel,
	voyageStateColour,
	voyageStateLabel,
} from "#voyages/labels.ts";

const countsLabel = (counts: VoyageSummary["counts"]): string =>
	`${counts.done}/${counts.pieces} landed · ${counts.active} active · ${counts.ready} ready`;

const CaptainCell = ({
	onError,
	voyage,
}: {
	readonly onError: (message: string) => void;
	readonly voyage: VoyageSummary;
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
			{captain.agentId.slice(0, 8)} · {captain.status}
		</span>
	);
};

const VoyageRow = ({
	onError,
	onSelect,
	selected,
	voyage,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (voyageId: string) => void;
	readonly selected: string | undefined;
	readonly voyage: VoyageSummary;
}) => (
	<div style={cardStyle}>
		<div style={rowStyle}>
			<button
				onClick={() => onSelect(voyage.id)}
				style={{
					...quietButtonStyle,
					...ellipsisStyle,
					color: voyage.id === selected ? "#a48fff" : "#7c9cff",
				}}
				title={voyage.name}
				type="button"
			>
				{voyage.name}
			</button>
			<span style={pillStyle(voyageStateColour[voyage.state])}>
				{voyageStateLabel[voyage.state]}
			</span>
		</div>
		<span style={mutedStyle}>★ {voyage.northStar}</span>
		<span style={mutedStyle}>{countsLabel(voyage.counts)}</span>
		<div style={{ ...rowStyle, flexWrap: "wrap" }}>
			<button
				onClick={() =>
					focusVoyage(voyage.id, voyage.focusedAt === null, onError)
				}
				style={buttonStyle}
				type="button"
			>
				{voyage.focusedAt === null ? "focus" : "unfocus"}
			</button>
			<CaptainCell onError={onError} voyage={voyage} />
		</div>
	</div>
);

export const VoyagesPanel = ({
	onError,
	onSelect,
	selected,
	voyages,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (voyageId: string) => void;
	readonly selected: string | undefined;
	readonly voyages: ReadonlyArray<VoyageSummary>;
}) => (
	<div style={columnStyle}>
		{voyages.length === 0 ? (
			<span style={mutedStyle}>no voyages open yet</span>
		) : null}
		{voyages.map((voyage) => (
			<VoyageRow
				key={voyage.id}
				onError={onError}
				onSelect={onSelect}
				selected={selected}
				voyage={voyage}
			/>
		))}
	</div>
);
