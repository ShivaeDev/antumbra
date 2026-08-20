import type {
	AgentSummary,
	BerthSummary,
	Fleet,
	SessionSummary,
} from "@antumbra/contract";
import { interruptSession, retireAgent } from "#adapters/trpc.ts";
import { AgentActivityChip } from "#views/agent-activity.tsx";
import {
	AgentDiagChips,
	FleetDiagChips,
	SessionDiagChips,
} from "#views/diagnostics.tsx";
import {
	buttonStyle,
	ellipsisStyle,
	mutedStyle,
	rowStyle,
} from "#views/styles.ts";
import { Truncated } from "#views/truncated.tsx";

const BerthReclaimStatus = ({ berth }: { readonly berth: BerthSummary }) => {
	if (berth.reclaimState === "claimed") {
		return <span style={{ color: "#ffb86b" }}>reclaiming</span>;
	}
	if (berth.status === "stranded") {
		return <span style={{ color: "#ff7c7c" }}>stranded</span>;
	}
	return null;
};

const BerthRow = ({ berth }: { readonly berth: BerthSummary }) => (
	<div style={{ ...rowStyle, paddingLeft: "0.8rem" }}>
		<span style={mutedStyle}>⚓</span>
		<Truncated style={mutedStyle} text={berth.slug} />
		<Truncated style={mutedStyle} text={berth.branch} />
		<BerthReclaimStatus berth={berth} />
	</div>
);

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
		<span style={mutedStyle}>{session.backend}</span>
		<span style={mutedStyle}>{session.status}</span>
		<SessionDiagChips diag={session.diag} />
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
			<strong style={ellipsisStyle} title={agent.role}>
				{agent.role}
			</strong>
			<span style={mutedStyle}>{agent.status}</span>
			<AgentActivityChip sessions={agent.sessions} />
			<AgentDiagChips diag={agent.diag} />
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
		{agent.berths
			.filter((berth) => berth.status !== "reclaimed")
			.map((berth) => (
				<BerthRow berth={berth} key={berth.slug} />
			))}
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
		{fleet === undefined ? null : <FleetDiagChips diag={fleet.diag} />}
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
