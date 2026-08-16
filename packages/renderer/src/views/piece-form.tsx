import type { PieceView } from "@antumbra/contract";
import { useState } from "react";
import { charterPiece } from "#adapters/trpc-voyages.ts";
import { PiecePicker, pickable } from "#views/piece-picker.tsx";
import {
	buttonStyle,
	columnStyle,
	inputStyle,
	mutedStyle,
} from "#views/styles.ts";

export const CharterPieceForm = ({
	onError,
	pieces,
	voyageId,
}: {
	readonly onError: (message: string) => void;
	readonly pieces: ReadonlyArray<PieceView>;
	readonly voyageId: string;
}) => {
	const [title, setTitle] = useState("");
	const [charter, setCharter] = useState("");
	const [expectation, setExpectation] = useState("");
	const [role, setRole] = useState("");
	const [dependsOn, setDependsOn] = useState<ReadonlyArray<string>>([]);
	const ready = title !== "" && charter !== "" && role !== "";
	const submit = () =>
		charterPiece(
			{ charter, dependsOn, expectation, role, title, voyageId },
			() => {
				setTitle("");
				setCharter("");
				setExpectation("");
				setDependsOn([]);
			},
			onError,
		);
	return (
		<div style={columnStyle}>
			<span style={mutedStyle}>+ charter piece</span>
			<input
				onChange={(event) => setTitle(event.target.value)}
				placeholder="title"
				style={inputStyle}
				value={title}
			/>
			<textarea
				onChange={(event) => setCharter(event.target.value)}
				placeholder="charter"
				rows={2}
				style={inputStyle}
				value={charter}
			/>
			<input
				onChange={(event) => setExpectation(event.target.value)}
				placeholder="expected outcome"
				style={inputStyle}
				value={expectation}
			/>
			<input
				onChange={(event) => setRole(event.target.value)}
				placeholder="role"
				style={inputStyle}
				value={role}
			/>
			<PiecePicker
				chosen={dependsOn}
				onChange={setDependsOn}
				pieces={pickable(pieces)}
			/>
			<button
				disabled={!ready}
				onClick={submit}
				style={{ ...buttonStyle, opacity: ready ? 1 : 0.5 }}
				type="button"
			>
				charter
			</button>
		</div>
	);
};
