import type { SessionSummary } from "@antumbra/contract";

type AgentActivity = "quiet" | "waiting" | "working";

// why: the fleet publishes capabilities, not Session execution state, so the
// roster says what the admiral may do to an agent right now — a session that
// can be interrupted is one taking a turn — and never claims to know whether a
// quiet session is idle or winding down.
const activityOf = (sessions: ReadonlyArray<SessionSummary>): AgentActivity => {
	if (sessions.some((session) => session.canInterrupt)) {
		return "working";
	}
	if (sessions.some((session) => session.status === "open")) {
		return "waiting";
	}
	return "quiet";
};

// why: same reading as the board — what moves is green, what waits is blue,
// what has nothing running recedes.
const activityColour: Readonly<Record<AgentActivity, string>> = {
	quiet: "#8a8f98",
	waiting: "#7c9cff",
	working: "#7cd3a0",
};

const activityLabel: Readonly<Record<AgentActivity, string>> = {
	quiet: "no session",
	waiting: "waiting",
	working: "working",
};

const dotStyle = (colour: string): React.CSSProperties => ({
	background: colour,
	borderRadius: "999px",
	height: "0.4rem",
	width: "0.4rem",
});

export const AgentActivityChip = ({
	sessions,
}: {
	readonly sessions: ReadonlyArray<SessionSummary>;
}) => {
	const activity = activityOf(sessions);
	const colour = activityColour[activity];
	return (
		<span
			style={{
				alignItems: "center",
				display: "inline-flex",
				gap: "0.3rem",
			}}
		>
			<span style={dotStyle(colour)} />
			<span style={{ color: colour, fontSize: "0.7rem" }}>
				{activityLabel[activity]}
			</span>
		</span>
	);
};
