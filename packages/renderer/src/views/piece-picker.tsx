import type { PieceView } from "@antumbra/contract";

// why: what a picker needs of a piece is what to call it — a piece from one
// voyage is named by its title, one drawn from the whole fleet says which
// voyage it belongs to, and the control learns neither.
interface PickablePiece {
	readonly id: string;
	readonly label: string;
}

export const pickable = (pieces: ReadonlyArray<PieceView>): ReadonlyArray<PickablePiece> =>
	pieces.map((piece) => ({ id: piece.id, label: piece.title }));

const chosenIds = (select: HTMLSelectElement): ReadonlyArray<string> => [...select.selectedOptions].map((option) => option.value);

// why: a piece's position is the set of pieces that gate it, so choosing that
// set is one control — the same one whether a piece is being chartered or
// rewired afterwards.
export const PiecePicker = ({
	chosen,
	exclude,
	id,
	onChange,
	pieces,
}: {
	readonly chosen: ReadonlyArray<string>;
	readonly exclude?: string;
	readonly id?: string;
	readonly onChange: (dependsOn: ReadonlyArray<string>) => void;
	readonly pieces: ReadonlyArray<PickablePiece>;
}) => {
	const offered = pieces.filter((piece) => piece.id !== exclude);
	if (offered.length === 0) {
		return <p className="text-2xs text-muted-foreground">Nothing else is chartered to depend on</p>;
	}
	return (
		<select
			className="w-full min-w-0 rounded-md border border-border bg-input p-1 text-xs text-foreground outline-none transition-colors focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40"
			id={id}
			multiple
			onChange={(event) => onChange(chosenIds(event.target))}
			size={Math.min(offered.length, 4)}
			value={[...chosen]}
		>
			{offered.map((piece) => (
				<option key={piece.id} value={piece.id}>
					{piece.label}
				</option>
			))}
		</select>
	);
};
