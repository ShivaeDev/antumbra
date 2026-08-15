import { useState } from "react";
import { spawnAgent } from "#adapters/trpc.ts";
import { buttonStyle, inputStyle } from "#views/styles.ts";

export const SpawnForm = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [role, setRole] = useState("");
	const [charter, setCharter] = useState("");
	const [cwd, setCwd] = useState("");
	const ready = role !== "" && charter !== "" && cwd !== "";
	const submit = () =>
		spawnAgent(
			{ backend: "claude", charter, cwd, role },
			() => {
				setRole("");
				setCharter("");
			},
			onError,
		);
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
				onClick={submit}
				style={{ ...buttonStyle, opacity: ready ? 1 : 0.5 }}
				type="button"
			>
				spawn
			</button>
		</div>
	);
};
