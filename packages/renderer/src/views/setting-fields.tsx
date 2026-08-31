import type { SettingCount } from "@antumbra/contract";
import { useState } from "react";
import { Button } from "#components/ui/button.tsx";
import { Input } from "#components/ui/input.tsx";

export const FlagField = ({
	checked,
	id,
	onChange,
}: {
	readonly checked: boolean;
	readonly id: string;
	readonly onChange: (value: boolean) => void;
}) => <input checked={checked} className="size-4 accent-primary" id={id} onChange={(event) => onChange(event.target.checked)} type="checkbox" />;

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
	const offered = Number.isInteger(parsed) && parsed >= declaration.least && parsed <= declaration.most;
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
			<Button disabled={!offered || parsed === value} onClick={() => onChange(parsed)}>
				Save
			</Button>
		</div>
	);
};
