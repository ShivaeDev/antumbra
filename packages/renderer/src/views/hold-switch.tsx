import { useId } from "react";

export const HoldSwitch = ({
	governs,
	held,
	onHold,
	word,
}: {
	readonly governs: string;
	readonly held: boolean;
	readonly onHold: (held: boolean) => void;
	readonly word: string;
}) => {
	const id = useId();
	return (
		<span className="flex items-center gap-2">
			<label className="text-2xs text-muted-foreground" htmlFor={id}>
				{word}
			</label>
			<input
				aria-label={governs}
				checked={!held}
				className="size-4 accent-primary"
				id={id}
				onChange={(event) => onHold(!event.target.checked)}
				type="checkbox"
			/>
		</span>
	);
};
