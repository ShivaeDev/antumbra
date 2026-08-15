import type { RepoSummary } from "@antumbra/contract";
import { useState } from "react";
import { forgetRepo, registerRepo } from "#adapters/trpc.ts";
import {
	buttonStyle,
	inputStyle,
	mutedStyle,
	rowStyle,
} from "#views/styles.ts";

const RepoRow = ({
	onError,
	repo,
}: {
	readonly onError: (message: string) => void;
	readonly repo: RepoSummary;
}) => (
	<div style={rowStyle}>
		<strong>{repo.name}</strong>
		<span style={mutedStyle}>{repo.source}</span>
		<span style={mutedStyle}>{repo.defaultRef}</span>
		<button
			onClick={() => forgetRepo(repo.id, onError)}
			style={buttonStyle}
			type="button"
		>
			forget
		</button>
	</div>
);

const AddRepoRow = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [source, setSource] = useState("");
	const [defaultRef, setDefaultRef] = useState("main");
	const ready = source !== "" && defaultRef !== "";
	const add = () =>
		registerRepo({ defaultRef, source }, () => setSource(""), onError);
	return (
		<div style={rowStyle}>
			<input
				onChange={(e) => setSource(e.target.value)}
				placeholder="source"
				style={{ ...inputStyle, flex: 2, minWidth: 0 }}
				value={source}
			/>
			<input
				onChange={(e) => setDefaultRef(e.target.value)}
				placeholder="ref"
				style={{ ...inputStyle, flex: 1, minWidth: 0 }}
				value={defaultRef}
			/>
			<button
				disabled={!ready}
				onClick={add}
				style={{ ...buttonStyle, opacity: ready ? 1 : 0.5 }}
				type="button"
			>
				add
			</button>
		</div>
	);
};

export const ReposPanel = ({
	onError,
	repos,
}: {
	readonly onError: (message: string) => void;
	readonly repos: ReadonlyArray<RepoSummary>;
}) => (
	<div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
		<h2 style={{ fontSize: "0.85rem", margin: 0 }}>repos</h2>
		<span style={mutedStyle}>every agent is moored to all of them</span>
		{repos.map((repo) => (
			<RepoRow key={repo.id} onError={onError} repo={repo} />
		))}
		<AddRepoRow onError={onError} />
	</div>
);
