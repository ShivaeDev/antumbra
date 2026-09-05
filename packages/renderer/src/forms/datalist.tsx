import { type ComponentProps, useId } from "react";
import { TextField } from "#forms/fields.tsx";

export const DatalistField = ({
	choices,
	...props
}: Omit<ComponentProps<typeof TextField>, "list"> & { readonly choices: ReadonlyArray<{ readonly value: string; readonly label: string }> }) => {
	const id = useId();
	const options = choices.map((choice) => (
		<option key={choice.value} value={choice.value}>
			{choice.label}
		</option>
	));
	return (
		<div className="min-w-0 flex-1">
			<TextField {...props} list={id} />
			<datalist id={id}>{options}</datalist>
		</div>
	);
};
