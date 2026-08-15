import { useState } from "react";
import { spawnAgent } from "#adapters/trpc.ts";
import { buttonStyle, inputStyle } from "#views/styles.ts";

export const SpawnForm = ({
	backends,
	onError,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly onError: (message: string) => void;
}) => {
	const [backend, setBackend] = useState("");
	const chosen = backends.includes(backend) ? backend : (backends[0] ?? "");
	const [role, setRole] = useState("");
	const [charter, setCharter] = useState("");
	const ready = role !== "" && charter !== "" && chosen !== "";
	const submit = () =>
		spawnAgent(
			{ backend: chosen, charter, role },
			() => {
				setRole("");
				setCharter("");
			},
			onError,
		);
	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
			<select
				onChange={(e) => setBackend(e.target.value)}
				style={inputStyle}
				value={chosen}
			>
				{backends.map((tag) => (
					<option key={tag} value={tag}>
						{tag}
					</option>
				))}
			</select>
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
