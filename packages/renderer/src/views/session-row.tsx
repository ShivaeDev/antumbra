import type { SessionSummary } from "@antumbra/contract";
import { interruptSession } from "#adapters/trpc.ts";
import { openWindow } from "#adapters/trpc-windows.ts";
import { SessionDiagChips } from "#views/diagnostics.tsx";
import { buttonStyle, mutedStyle, rowStyle } from "#views/styles.ts";

// why: a transcript worth watching is worth watching beside the work, so a
// session can be given a window of its own. Main decides whether one is
// minted; asking twice for the same session brings the first one forward.
export const SessionRow = ({
	onError,
	onSelect,
	selected,
	session,
}: {
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
	readonly session: SessionSummary;
}) => (
	<div style={{ ...rowStyle, paddingLeft: "0.8rem" }}>
		<button
			onClick={() => onSelect(session.id)}
			style={{
				...buttonStyle,
				background: "none",
				color: session.id === selected ? "#a48fff" : "#7c9cff",
				padding: 0,
			}}
			type="button"
		>
			{session.id.slice(0, 8)}
		</button>
		<span style={mutedStyle}>{session.backend}</span>
		<span style={mutedStyle}>{session.status}</span>
		<SessionDiagChips diag={session.diag} />
		<button
			onClick={() =>
				openWindow({ role: "transcript", sessionId: session.id }, onError)
			}
			style={buttonStyle}
			type="button"
		>
			open in window
		</button>
		{session.canInterrupt ? (
			<button
				onClick={() => interruptSession(session.id, onError)}
				style={buttonStyle}
				type="button"
			>
				interrupt
			</button>
		) : null}
	</div>
);
