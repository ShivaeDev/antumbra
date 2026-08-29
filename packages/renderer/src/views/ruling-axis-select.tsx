const SELECT_CLASS =
	"h-7 w-full min-w-0 rounded-md border border-border bg-input px-2 text-xs text-foreground outline-none focus-visible:border-ring/60 focus-visible:ring-2 focus-visible:ring-ring/40";

// why: a native select keeps a small control small, and its value is a word
// the record already speaks, so the choice is what the row will say.
export const AxisSelect = <Word extends string>({
	id,
	onChange,
	value,
	words,
}: {
	readonly id: string;
	readonly onChange: (word: Word) => void;
	readonly value: Word;
	readonly words: ReadonlyArray<Word>;
}) => (
	<select
		className={SELECT_CLASS}
		id={id}
		onChange={(event) => {
			const word = words.find((each) => each === event.target.value);
			if (word !== undefined) {
				onChange(word);
			}
		}}
		value={value}
	>
		{words.map((word) => (
			<option key={word} value={word}>
				{word}
			</option>
		))}
	</select>
);
