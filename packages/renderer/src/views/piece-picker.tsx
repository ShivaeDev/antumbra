import type { PieceView } from "@antumbra/contract";
import { inputStyle } from "#views/styles.ts";

const chosenIds = (select: HTMLSelectElement): ReadonlyArray<string> =>
	[...select.selectedOptions].map((option) => option.value);

// why: a piece's position is the set of pieces that gate it, so choosing that
// set is one control — the same one whether a piece is being chartered or
// rewired afterwards.
export const PiecePicker = ({
	chosen,
	exclude,
	onChange,
	pieces,
}: {
	readonly chosen: ReadonlyArray<string>;
	readonly exclude?: string;
	readonly onChange: (dependsOn: ReadonlyArray<string>) => void;
	readonly pieces: ReadonlyArray<PieceView>;
}) => {
	const offered = pieces.filter((piece) => piece.id !== exclude);
	if (offered.length === 0) {
		return null;
	}
	return (
		<select
			multiple
			onChange={(event) => onChange(chosenIds(event.target))}
			size={Math.min(offered.length, 4)}
			style={{ ...inputStyle, fontSize: "0.75rem" }}
			value={[...chosen]}
		>
			{offered.map((piece) => (
				<option key={piece.id} value={piece.id}>
					{piece.title}
				</option>
			))}
		</select>
	);
};
