import { useField, useSubmit } from "@antumbra/glass-form/react.ts";
import { useAtomRef } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId } from "react";
import { drawnAs } from "#controls.tsx";
import { DIALOG_KIT } from "#dialog-inputs.tsx";
import { type Editable, type Held, titleOf } from "#fields.ts";
import { changing, type Generated } from "#generated.ts";
import type { Shown } from "#inputs.tsx";
import { messageOf } from "#refusal.ts";
import { Button } from "#shadcn/button.tsx";
import { DialogClose, DialogFooter } from "#shadcn/dialog.tsx";
import { Label } from "#shadcn/label.tsx";

const Field = (props: {
	readonly change: (name: string, value: unknown) => void;
	readonly editable: Editable;
	readonly first: boolean;
	readonly form: Generated;
	readonly placeholder: string;
	readonly values: Held;
}) => {
	const named = useId();
	const said = useId();
	const field = useField(props.form, props.editable.name);
	const title = titleOf(props.editable);
	const shown: Shown = {
		described: field.error === undefined ? undefined : said,
		focus: props.first,
		invalid: field.error !== undefined,
		name: title,
		named,
		onBlur: field.onBlur,
		onChange: (value) => props.change(props.editable.name, value),
		placeholder: props.placeholder,
		value: field.value,
	};
	return (
		<div className="grid gap-1.5">
			<Label htmlFor={named}>{title}</Label>
			{drawnAs(props.editable, shown, props.values, DIALOG_KIT)}
			{field.error === undefined ? null : (
				<p className="text-xs text-destructive" id={said}>
					{field.error}
				</p>
			)}
		</div>
	);
};

const given = (value: unknown): boolean => value !== "" && value !== null && value !== undefined;

export const DialogForm = (props: {
	readonly cancel: boolean;
	readonly editables: readonly Editable[];
	readonly form: Generated;
	readonly placeholders: Readonly<Record<string, string>>;
	readonly submit: string;
}) => {
	const form = props.form;
	const values = useAtomRef(form.values);
	const submit = useSubmit(form);
	const change = changing(form, props.editables);
	const complete = props.editables.every((editable) => editable.editing.optional || given(values[editable.name]));
	const refused = AsyncResult.isFailure(submit.result) && !submit.result.waiting ? messageOf(submit.result.cause) : null;
	return (
		<form
			className="grid gap-4"
			onSubmit={(event) => {
				event.preventDefault();
				submit.run();
			}}
		>
			{props.editables.map((editable, place) => (
				<Field
					change={change}
					editable={editable}
					first={place === 0}
					form={form}
					key={editable.name}
					placeholder={props.placeholders[editable.name] ?? ""}
					values={values}
				/>
			))}
			{refused === null ? null : (
				<p className="text-xs text-destructive" role="alert">
					{refused}
				</p>
			)}
			<DialogFooter>
				{props.cancel ? (
					<DialogClose asChild>
						<Button size="sm" type="button" variant="ghost">
							Cancel
						</Button>
					</DialogClose>
				) : null}
				<Button disabled={!complete || submit.submitting} size="sm" type="submit">
					{props.submit}
				</Button>
			</DialogFooter>
		</form>
	);
};
