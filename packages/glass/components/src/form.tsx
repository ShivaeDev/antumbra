import { useSend } from "@antumbra/glass-client/hooks.ts";
import { useDirty, useSubmit } from "@antumbra/glass-form/react.ts";
import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { Send } from "@antumbra/platform-rpc/client.ts";
import { useAtomRef } from "@effect/atom-react";
import { Cause, Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { type ReactNode, useId, useState } from "react";
import { ALERT, HEAD, NAME, NOTE, ROW, SAVE, TITLE } from "#classes.ts";
import { Control } from "#controls.tsx";
import { type Editable, editablesOf, fedByOf, type Held, identityOf, labelOf, signatureOf, valuesOf } from "#fields.ts";
import { generate, type Sending, sending } from "#generated.ts";

const SAID = "The change could not be saved";

const NOTHING: readonly string[] = [];

const messageOf = (cause: Cause.Cause<unknown>): string => {
	const failure = Cause.findErrorOption(cause);
	return Option.isSome(failure) && failure.value instanceof Error && failure.value.message !== "" ? failure.value.message : SAID;
};

const Spacer = () => (
	<span aria-hidden="true" className={TITLE}>
		&nbsp;
	</span>
);

const Row = (props: {
	readonly description: string | undefined;
	readonly editables: readonly Editable[];
	readonly identity: Held;
	readonly label: string;
	readonly placeholders: Readonly<Record<string, string>>;
	readonly send: Sending;
	readonly titles: boolean;
	readonly values: Held;
}) => {
	const named = useId();
	const [form] = useState(() => generate(props.editables, props.identity, props.values, props.send));
	const values = useAtomRef(form.values);
	const dirty = useDirty(form);
	const submit = useSubmit(form);
	const fed = fedByOf(props.editables);
	const change = (name: string, value: unknown): void => {
		form.change(name, value);
		for (const fedName of fed.get(name) ?? NOTHING) {
			if (fedName !== name) {
				change(fedName, "");
			}
		}
	};
	const settled = AsyncResult.isFailure(submit.result) && !submit.result.waiting ? messageOf(submit.result.cause) : null;
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
					values={values}
				/>
			))}
			<span className={HEAD}>
				{props.titles ? <Spacer /> : null}
				<button className={dirty ? SAVE : `${SAVE} invisible`} disabled={!dirty || submit.submitting} type="submit">
					{submit.submitting ? "Saving…" : "Save"}
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

export const CommandForm = <Command extends CommandShape, Failure>(props: {
	readonly command: Send<Command, Failure>;
	readonly description?: string;
	readonly fixed?: readonly (keyof Values<Command["input"]> & string)[];
	readonly label?: string;
	readonly placeholders?: Readonly<Record<string, string>>;
	readonly row: Held;
	readonly titles?: boolean;
}): ReactNode => {
	const command = props.command.command;
	const fixed = props.fixed ?? NOTHING;
	const editables = editablesOf(command, fixed);
	const send = sending(useSend(props.command));
	return (
		<Row
			description={props.description}
			editables={editables}
			identity={identityOf(command, props.row)}
			key={signatureOf(editables, props.row)}
			label={props.label ?? labelOf(fixed, props.row)}
			placeholders={props.placeholders ?? {}}
			send={send}
			titles={props.titles === true}
			values={valuesOf(editables, props.row)}
		/>
	);
};
