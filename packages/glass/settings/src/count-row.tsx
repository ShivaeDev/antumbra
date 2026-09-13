import type { CountReading } from "@antumbra/domain-settings/queries/counts.ts";
import { SettingsRow } from "@antumbra/glass-components/compositions/settings-row.tsx";
import { editablesOf, identityOf, valuesOf } from "@antumbra/glass-components/fields.ts";
import { changing, sending, useGenerated } from "@antumbra/glass-components/generated.ts";
import { SaveAction } from "@antumbra/glass-components/save-action.tsx";
import { SettingsField } from "@antumbra/glass-components/settings-field.tsx";
import { useWrong } from "@antumbra/glass-components/wrong.ts";
import { useSubmit } from "@antumbra/glass-form/react.ts";
import { useAtomRef } from "@effect/atom-react";
import { useId, useMemo } from "react";
import type { SettingsApi } from "#glass.ts";

const FIXED = ["key"] as const;

const KEPT = () => undefined;

export const CountRow = ({ api, row }: { readonly api: SettingsApi; readonly row: typeof CountReading.Type }) => {
	const named = useId();
	const said = useId();
	const titled = useId();
	const command = api.settings.setCount.command;
	const editables = useMemo(() => editablesOf(command, FIXED), [command]);
	const send = useMemo(() => sending(api.settings.setCount), [api]);
	const form = useGenerated(editables, identityOf(command, row, editables), valuesOf(editables, row), send, KEPT);
	const values = useAtomRef(form.values);
	const submit = useSubmit(form);
	const change = changing(form, editables);
	const wrong = useWrong(form, editables, submit.result);
	const control = (
		<div className="flex items-center gap-2">
			{editables.map((editable) => (
				<SettingsField
					change={change}
					editable={editable}
					form={form}
					key={editable.name}
					label={row.title}
					named={named}
					placeholder=""
					said={said}
					values={values}
				/>
			))}
			{row.unit === null ? null : <span className="text-xs text-muted-foreground">{row.unit}</span>}
			<SaveAction form={form} />
		</div>
	);
	return (
		<form
			aria-labelledby={titled}
			onSubmit={(event) => {
				event.preventDefault();
				submit.run();
			}}
		>
			<SettingsRow control={control} help={row.description} htmlFor={named} label={row.title} labelId={titled} />
			{wrong === null ? null : (
				<p className="pb-3 text-xs text-destructive" id={said} role="alert">
					{wrong}
				</p>
			)}
		</form>
	);
};
