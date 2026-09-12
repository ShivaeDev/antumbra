import { useDirty, useSubmit } from "@antumbra/glass-form/react.ts";
import { useAtomRef } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId, useState } from "react";
import { ALERT, HEAD, NAME, NOTE, ROW, SAVE, TITLE } from "#classes.ts";
import { Control } from "#controls.tsx";
import { type Editable, emptyOf, fedByOf, type Held } from "#fields.ts";
import { generate, type Sending } from "#generated.ts";
import { messageOf } from "#refusal.ts";

const NOTHING: readonly Editable[] = [];

const SENDING_WORDS = "Saving…";

const Spacer = () => (
	<span aria-hidden="true" className={TITLE}>
		&nbsp;
	</span>
);

export const Row = (props: {
	readonly creating: boolean;
	readonly description: string | undefined;
	readonly editables: readonly Editable[];
	readonly identity: Held;
	readonly known: Held;
	readonly label: string;
	readonly placeholders: Readonly<Record<string, string>>;
	readonly send: Sending;
	readonly sent: () => void;
	readonly submit: string;
	readonly titles: boolean;
	readonly values: Held;
}) => {
	const named = useId();
	const [form] = useState(() => generate(props.editables, props.identity, props.values, props.send, props.sent));
	const values = useAtomRef(form.values);
	const dirty = useDirty(form);
	const submit = useSubmit(form);
	const fed = fedByOf(props.editables);
	const change = (name: string, value: unknown): void => {
		form.change(name, value);
		for (const editable of fed.get(name) ?? NOTHING) {
			if (editable.name !== name) {
				change(editable.name, emptyOf(editable.editing));
			}
		}
	};
	const settled = AsyncResult.isFailure(submit.result) && !submit.result.waiting ? messageOf(submit.result.cause) : null;
	const offered = props.creating || dirty;
	const words = props.creating || !submit.submitting ? props.submit : SENDING_WORDS;
	return (
		<form
			aria-labelledby={named}
			className={ROW}
			onSubmit={(event) => {
				event.preventDefault();
				submit.run();
			}}
		>
			<span className={HEAD}>
				{props.titles ? <Spacer /> : null}
				<span className={NAME} id={named}>
					{props.label}
				</span>
			</span>
			{props.editables.map((editable) => (
				<Control
					change={change}
					editable={editable}
					form={form}
					key={editable.name}
					label={props.label}
					placeholder={props.placeholders[editable.name]}
					titles={props.titles}
					values={{ ...props.known, ...values }}
				/>
			))}
			<span className={HEAD}>
				{props.titles ? <Spacer /> : null}
				<button className={offered ? SAVE : `${SAVE} invisible`} disabled={!offered || submit.submitting} type="submit">
					{words}
				</button>
			</span>
			{props.description === undefined ? null : <p className={`w-full ${NOTE}`}>{props.description}</p>}
			{settled === null ? null : (
				<p className={`w-full pl-[5rem] ${ALERT}`} role="alert">
					{settled}
				</p>
			)}
		</form>
	);
};
