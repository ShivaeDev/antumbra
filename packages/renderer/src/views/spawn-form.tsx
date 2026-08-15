import { useState } from "react";
import { spawnAgent } from "#adapters/trpc.ts";
import { parseRepoLines } from "#views/repo-lines.ts";
import { buttonStyle, inputStyle } from "#views/styles.ts";

export const SpawnForm = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [role, setRole] = useState("");
	const [charter, setCharter] = useState("");
	const [repoLines, setRepoLines] = useState("");
	const ready = role !== "" && charter !== "";
	const submit = () =>
		spawnAgent(
			{
				backend: "claude",
				charter,
				repos: parseRepoLines(repoLines),
				role,
			},
			() => {
				setRole("");
				setCharter("");
				setRepoLines("");
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
			<textarea
				onChange={(e) => setRepoLines(e.target.value)}
				placeholder={
					"repos — one per line: source [ref]\nempty = scratch berth"
				}
				rows={2}
				style={inputStyle}
				value={repoLines}
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
