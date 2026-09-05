import { useStore } from "@tanstack/react-form";
import type { ComponentProps } from "react";
import { useFieldContext } from "#forms/context.ts";
import { Field } from "#forms/fields.tsx";

export const NativeSelectField = ({
	label,
	children,
	...props
}: Omit<ComponentProps<"select">, "value" | "defaultValue" | "onChange" | "onBlur" | "name" | "id"> & { readonly label: string }) => {
	const field = useFieldContext<string>();
	const state = useStore(field.store);
	return (
		<Field label={label}>
			{(id) => (
				<select
					{...props}
					id={id}
					name={field.name}
					value={state.value}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={state.meta.isTouched && !state.meta.isValid}
					aria-describedby={`${id}-error`}
				>
					{children}
				</select>
			)}
		</Field>
	);
};
