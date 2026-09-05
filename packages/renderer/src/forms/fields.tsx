import { useStore } from "@tanstack/react-form";
import type { ComponentProps, ReactNode } from "react";
import { Input } from "#components/ui/input.tsx";
import { Select, SelectContent, SelectTrigger, SelectValue } from "#components/ui/select.tsx";
import { SelectItem } from "#components/ui/select-parts.tsx";
import { Textarea } from "#components/ui/textarea.tsx";
import { useFieldContext } from "#forms/context.ts";
import { errorMessage } from "#forms/messages.ts";

export const Field = ({ label, children }: { readonly label: string; readonly children: (id: string) => ReactNode }) => {
	const field = useFieldContext<unknown>();
	const state = useStore(field.store);
	return (
		<div className="flex flex-col gap-1">
			<label className="text-2xs text-muted-foreground" htmlFor={`${field.form.formId}-${field.name}`}>
				{label}
			</label>
			{children(`${field.form.formId}-${field.name}`)}
			{state.meta.isTouched && state.meta.errors.length > 0 ? (
				<p className="text-2xs text-destructive" id={`${field.form.formId}-${field.name}-error`}>
					{state.meta.errors.map(errorMessage).join(". ")}
				</p>
			) : null}
		</div>
	);
};

export const TextField = ({ label, placeholder }: { readonly label: string; readonly placeholder?: string }) => {
	const field = useFieldContext<string>();
	const state = useStore(field.store);
	return (
		<Field label={label}>
			{(id) => (
				<Input
					id={id}
					name={field.name}
					value={state.value}
					placeholder={placeholder}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={state.meta.isTouched && !state.meta.isValid}
					aria-describedby={`${field.form.formId}-${field.name}-error`}
				/>
			)}
		</Field>
	);
};

export const TextareaField = ({
	label,
	...props
}: Omit<ComponentProps<typeof Textarea>, "value" | "defaultValue" | "onChange" | "onBlur" | "name" | "id"> & { readonly label: string }) => {
	const field = useFieldContext<string>();
	const state = useStore(field.store);
	return (
		<Field label={label}>
			{(id) => (
				<Textarea
					{...props}
					id={id}
					name={field.name}
					value={state.value}
					rows={props.rows ?? 3}
					onBlur={field.handleBlur}
					onChange={(event) => field.handleChange(event.target.value)}
					aria-invalid={state.meta.isTouched && !state.meta.isValid}
					aria-describedby={`${field.form.formId}-${field.name}-error`}
				/>
			)}
		</Field>
	);
};

export const SelectField = ({
	label,
	placeholder,
	choices,
	...triggerProps
}: Omit<ComponentProps<typeof SelectTrigger>, "id" | "onBlur" | "children"> & {
	readonly label: string;
	readonly placeholder: string;
	readonly choices: ReadonlyArray<{ readonly value: string; readonly label: string }>;
}) => {
	const field = useFieldContext<string>();
	const state = useStore(field.store);
	const options = choices.map((choice) => (
		<SelectItem key={choice.value} value={choice.value}>
			{choice.label}
		</SelectItem>
	));
	return (
		<Field label={label}>
			{(id) => (
				<Select value={state.value} onValueChange={field.handleChange}>
					<SelectTrigger
						{...triggerProps}
						id={id}
						onBlur={field.handleBlur}
						aria-invalid={state.meta.isTouched && !state.meta.isValid}
						aria-describedby={`${id}-error`}
					>
						<SelectValue placeholder={placeholder} />
					</SelectTrigger>
					<SelectContent>{options}</SelectContent>
				</Select>
			)}
		</Field>
	);
};
