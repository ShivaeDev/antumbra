import type { RoleDefault } from "@antumbra/domain-role-settings/queries/defaults.ts";
import { RoleGrid } from "@antumbra/glass-components/compositions/role-grid.tsx";
import { capitalised, editablesOf, identityOf, titleOf, valuesOf } from "@antumbra/glass-components/fields.ts";
import { changing, sending, useGenerated } from "@antumbra/glass-components/generated.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { SaveAction } from "@antumbra/glass-components/save-action.tsx";
import { SettingsField } from "@antumbra/glass-components/settings-field.tsx";
import { useSubmit } from "@antumbra/glass-form/react.ts";
import type { Inherited } from "@antumbra/platform-vocabulary/role-setting.ts";
import { useAtomRef } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { type ReactNode, useId, useMemo } from "react";
import type { Choose } from "#glass.ts";
import { placeholdersOf } from "#resolved.ts";

const COLUMNS = ["Backend", "Model", "Effort"] as const;

const FIXED = ["scope", "role"] as const;

const KEPT = () => undefined;

const RoleRow = (props: {
	readonly choose: Choose;
	readonly inherits: Inherited;
	readonly labelId: string;
	readonly row: typeof RoleDefault.Type;
}) => {
	const said = useId();
	const editables = useMemo(() => editablesOf(props.choose.command, FIXED), [props.choose]);
	const send = useMemo(() => sending(props.choose), [props.choose]);
	const form = useGenerated(editables, identityOf(props.choose.command, props.row, editables), valuesOf(editables, props.row), send, KEPT);
	const values = useAtomRef(form.values);
	const change = changing(form, editables);
	const submit = useSubmit(form);
	const refused = AsyncResult.isFailure(submit.result) && !submit.result.waiting ? messageOf(submit.result.cause) : null;
	const placeholders = placeholdersOf(props.row.resolved, props.inherits);
	const named = capitalised(props.row.role);
	return (
		<form
			aria-labelledby={props.labelId}
			className="contents"
			onSubmit={(event) => {
				event.preventDefault();
				submit.run();
			}}
		>
			{editables.map((editable) => (
				<SettingsField
					change={change}
					editable={editable}
					form={form}
					key={editable.name}
					label={`${named} ${titleOf(editable)}`}
					named={`${said}${editable.name}`}
					placeholder={placeholders[editable.name] ?? ""}
					said={said}
					values={values}
				/>
			))}
			<SaveAction form={form} />
			{refused === null ? null : (
				<p className="col-span-full text-xs text-destructive" id={said} role="alert">
					{refused}
				</p>
			)}
		</form>
	);
};

export const RoleForms = (props: { readonly choose: Choose; readonly inherits: Inherited; readonly rows: readonly (typeof RoleDefault.Type)[] }) => {
	const prefix = useId();
	const rows: { cells: ReactNode; label: string; labelId: string }[] = [];
	for (const row of props.rows) {
		const labelId = `${prefix}${row.role}`;
		rows.push({
			cells: <RoleRow choose={props.choose} inherits={props.inherits} labelId={labelId} row={row} />,
			label: capitalised(row.role),
			labelId,
		});
	}
	return <RoleGrid columns={COLUMNS} rows={rows} />;
};
