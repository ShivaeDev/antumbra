import { useState } from "react";
import { openVoyage } from "#adapters/trpc-voyages.ts";
import {
	buttonStyle,
	columnStyle,
	inputStyle,
	mutedStyle,
} from "#views/styles.ts";

export const OpenVoyageForm = ({
	backends,
	onError,
	onOpened,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly onError: (message: string) => void;
	readonly onOpened: (voyageId: string) => void;
}) => {
	const [name, setName] = useState("");
	const [northStar, setNorthStar] = useState("");
	const [context, setContext] = useState("");
	const [backend, setBackend] = useState("");
	const chosen = backends.includes(backend) ? backend : (backends[0] ?? "");
	const ready = name !== "" && northStar !== "" && chosen !== "";
	const submit = () =>
		openVoyage(
			{ backend: chosen, context, name, northStar },
			(opened) => {
				setName("");
				setNorthStar("");
				setContext("");
				onOpened(opened.id);
			},
			onError,
		);
	return (
		<div style={columnStyle}>
			<span style={mutedStyle}>+ open voyage</span>
			<input
				onChange={(event) => setName(event.target.value)}
				placeholder="name"
				style={inputStyle}
				value={name}
			/>
			<input
				onChange={(event) => setNorthStar(event.target.value)}
				placeholder="north star"
				style={inputStyle}
				value={northStar}
			/>
			<textarea
				onChange={(event) => setContext(event.target.value)}
				placeholder="context"
				rows={2}
				style={inputStyle}
				value={context}
			/>
			<select
				onChange={(event) => setBackend(event.target.value)}
				style={inputStyle}
				value={chosen}
			>
				{backends.map((tag) => (
					<option key={tag} value={tag}>
						{tag}
					</option>
				))}
			</select>
			<button
				disabled={!ready}
				onClick={submit}
				style={{ ...buttonStyle, opacity: ready ? 1 : 0.5 }}
				type="button"
			>
				open
			</button>
		</div>
	);
};
