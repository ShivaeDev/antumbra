import type { SettingCount } from "@antumbra/contract";
import { useState } from "react";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";

// why: there is no switch primitive in this app and a setting does not earn a
// new dependency, so the toggle is the browser's own checkbox. It commits on
// the click, because a boolean has nothing to type and nothing to correct.
export const FlagField = ({
	checked,
	id,
	onChange,
}: {
	readonly checked: boolean;
	readonly id: string;
	readonly onChange: (value: boolean) => void;
}) => (
	<input
		checked={checked}
		className="size-4 accent-primary"
		id={id}
		onChange={(event) => onChange(event.target.checked)}
		type="checkbox"
	/>
);

// why: a number is typed a digit at a time, and every intermediate keystroke
// is a value the declaration would refuse. The field holds the draft and only
// the button offers it, so the refusal a reader sees is one they meant.
export const CountField = ({
	declaration,
	id,
	onChange,
	value,
}: {
	readonly declaration: SettingCount;
	readonly id: string;
	readonly onChange: (value: number) => void;
	readonly value: number;
}) => {
	const [draft, setDraft] = useState(String(value));
	const parsed = Number(draft);
	const offered =
		Number.isInteger(parsed) &&
		parsed >= declaration.least &&
		parsed <= declaration.most;
	return (
		<div className="flex items-center gap-2">
			<Input
				className="w-28"
				id={id}
				max={declaration.most}
				min={declaration.least}
				onChange={(event) => setDraft(event.target.value)}
				step={1}
				type="number"
				value={draft}
			/>
			<Button
				disabled={!offered || parsed === value}
				onClick={() => onChange(parsed)}
			>
				Save
			</Button>
		</div>
	);
};
