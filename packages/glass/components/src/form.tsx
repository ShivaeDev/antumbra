import { useSend } from "@antumbra/glass-client/hooks.ts";
import { useDirty, useSubmit } from "@antumbra/glass-form/react.ts";
import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { Send } from "@antumbra/platform-rpc/client.ts";
import { useAtomRef } from "@effect/atom-react";
import { Cause, Option } from "effect";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { type ReactNode, useId, useState } from "react";
import { ALERT, HEAD, NAME, ROW, SAVE, TITLE } from "#classes.ts";
import { Control } from "#controls.tsx";
import { type Editable, editablesOf, fedByOf, fixedNames, fixedValues, type Held, identityOf, labelOf, signatureOf, valuesOf } from "#fields.ts";
import { generate, type Sending, sending } from "#generated.ts";

const SAID = "The change could not be saved";

const NOTHING: readonly string[] = [];

const BLANK: Held = {};

const SAVE_WORDS = "Save";

const SENDING_WORDS = "Saving…";

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
	readonly creating: boolean;
	readonly editables: readonly Editable[];
	readonly identity: Held;
	readonly label: string;
	readonly placeholders: Readonly<Record<string, string>>;
	readonly send: Sending;
	readonly sent: (() => void) | undefined;
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
		for (const fedName of fed.get(name) ?? NOTHING) {
			if (fedName !== name) {
				change(fedName, "");
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
					values={values}
				/>
			))}
			<span className={HEAD}>
				{props.titles ? <Spacer /> : null}
				<button className={offered ? SAVE : `${SAVE} invisible`} disabled={!offered || submit.submitting} type="submit">
					{words}
				</button>
			</span>
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
	readonly fixed?: readonly (keyof Values<Command["input"]> & string)[] | Readonly<Partial<Values<Command["input"]>>>;
	readonly label?: string;
	readonly placeholders?: Readonly<Record<string, string>>;
	readonly row?: Held;
	readonly submit?: string;
	readonly titles?: boolean;
}): ReactNode => {
	const command = props.command.command;
	const [cleared, setCleared] = useState(0);
	const send = sending(useSend(props.command));
	const fixed = props.fixed ?? NOTHING;
	const names = fixedNames(fixed);
	const editables = editablesOf(command, names);
	const creating = props.row === undefined;
	const row = props.row ?? BLANK;
	const submit = props.submit ?? SAVE_WORDS;
	return (
		<Row
			creating={creating}
			editables={editables}
			identity={{ ...identityOf(command, row), ...fixedValues(fixed) }}
			key={`${signatureOf(editables, row)}/${cleared}`}
			label={props.label ?? (creating ? submit : labelOf(names, row))}
			placeholders={props.placeholders ?? {}}
			send={send}
			sent={creating ? () => setCleared((count) => count + 1) : undefined}
			submit={submit}
			titles={props.titles === true}
			values={valuesOf(editables, row)}
		/>
	);
};
