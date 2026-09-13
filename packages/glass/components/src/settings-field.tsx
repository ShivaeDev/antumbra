import { useField } from "@antumbra/glass-form/react.ts";
import type { ReactNode } from "react";
import { drawnAs } from "#controls.tsx";
import type { Editable, Held } from "#fields.ts";
import type { Generated } from "#generated.ts";
import type { Shown } from "#inputs.tsx";
import { SHADCN_KIT } from "#shadcn-inputs.tsx";

export const SettingsField = (props: {
	readonly change: (name: string, value: unknown) => void;
	readonly editable: Editable;
	readonly form: Generated;
	readonly label: string;
	readonly named: string;
	readonly placeholder: string;
	readonly said: string;
	readonly values: Held;
}): ReactNode => {
	const field = useField(props.form, props.editable.name);
	const shown: Shown = {
		described: field.error === undefined ? undefined : props.said,
		focus: false,
		invalid: field.error !== undefined,
		name: props.label,
		named: props.named,
		onBlur: field.onBlur,
		onChange: (value) => props.change(props.editable.name, value),
		placeholder: props.placeholder,
		value: field.value,
	};
	return drawnAs(props.editable, shown, props.values, SHADCN_KIT);
};
