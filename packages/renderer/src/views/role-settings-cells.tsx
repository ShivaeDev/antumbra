import { useId } from "react";
import { Input } from "#components/ui/input.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";

const FLEET_DEFAULT = "@fleet-default";

export const BackendCell = ({
	backends,
	chosen,
	inheritLabel,
	label,
	onChange,
	placeholder,
}: {
	readonly backends: ReadonlyArray<string>;
	readonly chosen: string;
	readonly inheritLabel: string | null;
	readonly label: string;
	readonly onChange: (backend: string) => void;
	readonly placeholder: string;
}) => (
	<td>
		<Select disabled={backends.length === 0} onValueChange={(backend) => onChange(backend === FLEET_DEFAULT ? "" : backend)} value={chosen}>
			<SelectTrigger aria-label={`${label} backend`}>
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				{inheritLabel === null ? null : <SelectItem value={FLEET_DEFAULT}>{inheritLabel}</SelectItem>}
				{backends.map((tag) => (
					<SelectItem key={tag} value={tag}>
						{tag}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	</td>
);

export const SuggestedCell = ({
	label,
	onChange,
	suggestions,
	placeholder,
	value,
}: {
	readonly label: string;
	readonly onChange: (value: string) => void;
	readonly suggestions: ReadonlyArray<{ readonly label: string; readonly value: string }>;
	readonly placeholder: string;
	readonly value: string;
}) => {
	const list = useId();
	return (
		<td className="pl-2">
			<Input aria-label={label} list={list} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} value={value} />
			<datalist id={list}>
				{suggestions.map((suggestion) => (
					<option key={suggestion.value} value={suggestion.value}>
						{suggestion.label}
					</option>
				))}
			</datalist>
		</td>
	);
};
