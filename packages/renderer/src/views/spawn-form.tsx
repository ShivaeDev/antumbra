import { useState } from "react";
import { spawnAgent } from "#adapters/trpc.ts";
import { parseRepoLines } from "#views/repo-lines.ts";
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
	const [repoLines, setRepoLines] = useState("");
	const ready = role !== "" && charter !== "" && chosen !== "";
	const submit = () =>
		spawnAgent(
			{
				backend: chosen,
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
