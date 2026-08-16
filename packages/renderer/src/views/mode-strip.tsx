import { buttonStyle, rowStyle } from "#views/styles.ts";

// why: the window watches three things — the fleet at work, the voyages the
// work is for, and the quay where finished work waits on a host. They share
// one aside, so the strip says which is on show.
export type Mode = "fleet" | "voyages" | "quay";

const MODES: ReadonlyArray<Mode> = ["fleet", "voyages", "quay"];

export const ModeStrip = ({
	mode,
	onMode,
}: {
	readonly mode: Mode;
	readonly onMode: (mode: Mode) => void;
}) => (
	<div style={rowStyle}>
		{MODES.map((offered) => (
			<button
				key={offered}
				onClick={() => onMode(offered)}
				style={{
					...buttonStyle,
					background: offered === mode ? "#3a3f4a" : "none",
					color: offered === mode ? "#e4e2dd" : "#8a8f98",
				}}
				type="button"
			>
				{offered}
			</button>
		))}
	</div>
);
