import type { AgentSummary, Fleet, SessionSummary } from "@antumbra/contract";
import { interruptSession, retireAgent } from "#adapters/trpc.ts";
import { buttonStyle, mutedStyle, rowStyle } from "#views/styles.ts";

const SessionRow = ({
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
		<span style={mutedStyle}>{session.status}</span>
		{session.status === "open" ? (
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

const AgentRow = ({
	agent,
	onError,
	onSelect,
	selected,
}: {
	readonly agent: AgentSummary;
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
}) => (
	<div>
		<div style={rowStyle}>
			<strong>{agent.role}</strong>
			<span style={mutedStyle}>{agent.status}</span>
			{agent.status === "alive" ? (
				<button
					onClick={() => retireAgent(agent.id, onError)}
					style={buttonStyle}
					type="button"
				>
					retire
				</button>
			) : null}
		</div>
		{agent.sessions.map((session) => (
			<SessionRow
				key={session.id}
				onError={onError}
				onSelect={onSelect}
				selected={selected}
				session={session}
			/>
		))}
	</div>
);

export const FleetPanel = ({
	fleet,
	onError,
	onSelect,
	selected,
}: {
	readonly fleet: Fleet | undefined;
	readonly onError: (message: string) => void;
	readonly onSelect: (sessionId: string) => void;
	readonly selected: string | undefined;
}) => (
	<div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
		{(fleet?.agents ?? []).map((agent) => (
			<AgentRow
				agent={agent}
				key={agent.id}
				onError={onError}
				onSelect={onSelect}
				selected={selected}
			/>
		))}
	</div>
);
