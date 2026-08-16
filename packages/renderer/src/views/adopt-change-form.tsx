import type { QuayPiece } from "@antumbra/contract";
import { useState } from "react";
import { adoptChange } from "#adapters/trpc-quay.ts";
import { PiecePicker } from "#views/piece-picker.tsx";
import {
	buttonStyle,
	columnStyle,
	inputStyle,
	mutedStyle,
} from "#views/styles.ts";

// why: the quay draws from the whole fleet, so a piece is named with the
// voyage it belongs to — two voyages may well charter a piece by one title.
const offered = (pieces: ReadonlyArray<QuayPiece>) =>
	pieces.map((piece) => ({
		id: piece.id,
		label: `${piece.voyageName} › ${piece.title}`,
	}));

export const AdoptChangeForm = ({
	onError,
	pieces,
}: {
	readonly onError: (message: string) => void;
	readonly pieces: ReadonlyArray<QuayPiece>;
}) => {
	const [pieceId, setPieceId] = useState<string | undefined>(undefined);
	const [repoName, setRepoName] = useState("");
	const [url, setUrl] = useState("");
	const ready = pieceId !== undefined && repoName !== "" && url !== "";
	const adopt = () => {
		if (pieceId === undefined) {
			return;
		}
		adoptChange({ pieceId, repoName, url }, () => setUrl(""), onError);
	};
	return (
		<div style={columnStyle}>
			<span style={mutedStyle}>+ adopt a change opened by hand</span>
			<PiecePicker
				chosen={pieceId === undefined ? [] : [pieceId]}
				// why: one change is adopted onto one piece, so the last option
				// touched is the choice rather than the whole selection.
				onChange={(chosen) => setPieceId(chosen.at(-1))}
				pieces={offered(pieces)}
			/>
			<input
				onChange={(event) => setRepoName(event.target.value)}
				placeholder="repo"
				style={inputStyle}
				value={repoName}
			/>
			<input
				onChange={(event) => setUrl(event.target.value)}
				placeholder="url"
				style={inputStyle}
				value={url}
			/>
			<button
				disabled={!ready}
				onClick={adopt}
				style={{ ...buttonStyle, opacity: ready ? 1 : 0.5 }}
				type="button"
			>
				adopt
			</button>
		</div>
	);
};
