import { useStore } from "@tanstack/react-form";
import type { ComponentProps, ReactNode } from "react";
import { useFieldContext } from "#forms/context.ts";
import { Field } from "#forms/fields.tsx";

export const CheckboxField = ({
	label,
	checked,
	...props
}: Omit<ComponentProps<"input">, "value" | "defaultValue" | "defaultChecked" | "onChange" | "onBlur" | "name" | "id" | "type"> & {
	readonly label: ReactNode;
}) => {
	const field = useFieldContext<boolean>();
	const state = useStore(field.store);
	return (
		<Field label={label}>
			{(id) => (
				<input
					{...props}
					type="checkbox"
					id={id}
					name={field.name}
					checked={checked ?? state.value}
					onChange={(event) => field.handleChange(event.target.checked)}
					onBlur={field.handleBlur}
					aria-invalid={state.meta.isTouched && !state.meta.isValid}
					aria-describedby={`${id}-error`}
				/>
			)}
		</Field>
	);
};
