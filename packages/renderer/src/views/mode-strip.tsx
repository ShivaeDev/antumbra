import type { ConsoleMode } from "@antumbra/contract";
import { buttonStyle, rowStyle } from "#views/styles.ts";

const MODES: ReadonlyArray<ConsoleMode> = ["fleet", "voyages", "quay"];

export const ModeStrip = ({
	mode,
	onMode,
}: {
	readonly mode: ConsoleMode;
	readonly onMode: (mode: ConsoleMode) => void;
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
