import type { Fleet } from "@antumbra/contract";
import { useState } from "react";
import { interruptSession, retireAgent, spawnAgent } from "#adapters/trpc.ts";

const buttonStyle: React.CSSProperties = {
	background: "#2e323a",
	border: "none",
	borderRadius: "4px",
	color: "#e4e2dd",
	cursor: "pointer",
	fontSize: "0.75rem",
	padding: "0.2rem 0.6rem",
};

const inputStyle: React.CSSProperties = {
	background: "#20242c",
	border: "1px solid #2e323a",
	borderRadius: "4px",
	color: "#e4e2dd",
	padding: "0.35rem 0.5rem",
};

export const SpawnForm = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [role, setRole] = useState("");
	const [charter, setCharter] = useState("");
	const [cwd, setCwd] = useState("");
	const ready = role !== "" && charter !== "" && cwd !== "";
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
			<input
				onChange={(e) => setRole(e.target.value)}
				placeholder="role"
				style={inputStyle}
				value={role}
			/>
			<textarea
				onChange={(e) => setCharter(e.target.value)}
				placeholder="charter"
				rows={3}
				style={inputStyle}
				value={charter}
			/>
			<input
				onChange={(e) => setCwd(e.target.value)}
				placeholder="working directory"
				style={inputStyle}
				value={cwd}
			/>
			<button
				disabled={!ready}
				onClick={() =>
					spawnAgent(
						{ backend: "claude", charter, cwd, role },
						() => {
							setRole("");
							setCharter("");
						},
						onError,
					)
				}
				style={{ ...buttonStyle, opacity: ready ? 1 : 0.5 }}
				type="button"
			>
				spawn
			</button>
		</div>
	);
};

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
			<div key={agent.id}>
				<div style={{ alignItems: "baseline", display: "flex", gap: "0.5rem" }}>
					<strong>{agent.role}</strong>
					<span style={{ color: "#8a8f98", fontSize: "0.75rem" }}>
						{agent.status}
					</span>
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
					<div
						key={session.id}
						style={{
							alignItems: "baseline",
							display: "flex",
							gap: "0.5rem",
							paddingLeft: "0.8rem",
						}}
					>
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
						<span style={{ color: "#8a8f98", fontSize: "0.75rem" }}>
							{session.status}
						</span>
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
				))}
			</div>
		))}
	</div>
);
