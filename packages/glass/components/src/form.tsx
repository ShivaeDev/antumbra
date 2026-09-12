import type { CommandShape } from "@antumbra/platform-feature/command.ts";
import type { Values } from "@antumbra/platform-feature/fields.ts";
import type { Send } from "@antumbra/platform-rpc/client.ts";
import { type ReactNode, useState } from "react";
import { editablesOf, fixedNames, fixedValues, type Held, identityOf, labelOf, valuesOf } from "#fields.ts";
import { sending } from "#generated.ts";
import { Row } from "#row.tsx";

const NOTHING: readonly string[] = [];

const BLANK: Held = {};

const SAVE_WORDS = "Save";

export const CommandForm = <Command extends CommandShape, Failure>(props: {
	readonly command: Send<Command, Failure>;
	readonly description?: string;
	readonly fixed?: readonly (keyof Values<Command["input"]> & string)[] | Readonly<Partial<Values<Command["input"]>>>;
	readonly label?: string;
	readonly placeholders?: Readonly<Record<string, string>>;
	readonly row?: Held;
	readonly sent?: () => void;
	readonly submit?: string;
	readonly titles?: boolean;
}): ReactNode => {
	const command = props.command.command;
	const [cleared, setCleared] = useState(0);
	const send = sending(props.command);
	const fixed = props.fixed ?? NOTHING;
	const names = fixedNames(fixed);
	const editables = editablesOf(command, names);
	const creating = props.row === undefined;
	const row = props.row ?? BLANK;
	const submit = props.submit ?? SAVE_WORDS;
	const identity = { ...identityOf(command, row, editables), ...fixedValues(fixed) };
	const answered = () => {
		if (creating) {
			setCleared((count) => count + 1);
		}
		props.sent?.();
	};
	return (
		<Row
			creating={creating}
			description={props.description}
			editables={editables}
			heading
			identity={identity}
			key={JSON.stringify([identity, editables.map(({ name }) => name), creating, cleared])}
			known={{ ...row, ...fixedValues(fixed) }}
			label={props.label ?? (creating ? submit : labelOf(names, row))}
			placeholders={props.placeholders ?? {}}
			send={send}
			sent={answered}
			submit={submit}
			titles={props.titles === true}
			values={valuesOf(editables, row)}
		/>
	);
};
