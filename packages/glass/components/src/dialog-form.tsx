import { useField, useSubmit } from "@antumbra/glass-form/react.ts";
import { useAtomRef } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId } from "react";
import { type Editable, titleOf } from "#fields.ts";
import type { Generated } from "#generated.ts";
import { worded } from "#inputs.tsx";
import { messageOf } from "#refusal.ts";
import { Button } from "#shadcn/button.tsx";
import { DialogClose, DialogFooter } from "#shadcn/dialog.tsx";
import { Input } from "#shadcn/input.tsx";
import { Label } from "#shadcn/label.tsx";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "#shadcn/select.tsx";

interface Shown {
	readonly described: string | undefined;
	readonly first: boolean;
	readonly invalid: boolean;
	readonly named: string;
	readonly onBlur: () => void;
	readonly onChange: (value: string) => void;
	readonly placeholder: string;
	readonly value: string;
}

const Words = ({ shown }: { readonly shown: Shown }) => (
	<Input
		aria-describedby={shown.described}
		aria-invalid={shown.invalid}
		autoFocus={shown.first}
		id={shown.named}
		onBlur={shown.onBlur}
		onChange={(event) => shown.onChange(event.target.value)}
		placeholder={shown.placeholder}
		value={shown.value}
	/>
);

const Listed = ({ literals, shown }: { readonly literals: readonly string[]; readonly shown: Shown }) => (
	<Select onValueChange={shown.onChange} value={shown.value}>
		<SelectTrigger aria-describedby={shown.described} aria-invalid={shown.invalid} className="w-full" id={shown.named} size="sm">
			<SelectValue placeholder={shown.placeholder} />
		</SelectTrigger>
		<SelectContent>
			{literals.map((literal) => (
				<SelectItem key={literal} value={literal}>
					{literal}
				</SelectItem>
			))}
		</SelectContent>
	</Select>
);

const Field = (props: { readonly editable: Editable; readonly first: boolean; readonly form: Generated; readonly placeholder: string }) => {
	const named = useId();
	const said = useId();
	const field = useField(props.form, props.editable.name);
	const literals = props.editable.editing.literals;
	const shown: Shown = {
		described: field.error === undefined ? undefined : said,
		first: props.first,
		invalid: field.error !== undefined,
		named,
		onBlur: field.onBlur,
		onChange: field.onChange,
		placeholder: props.placeholder,
		value: worded(field.value),
	};
	return (
		<div className="grid gap-1.5">
			<Label htmlFor={named}>{titleOf(props.editable)}</Label>
			{literals === undefined ? <Words shown={shown} /> : <Listed literals={literals} shown={shown} />}
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
				<Field editable={editable} first={place === 0} form={form} key={editable.name} placeholder={props.placeholders[editable.name] ?? ""} />
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
