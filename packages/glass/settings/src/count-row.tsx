import type { CountReading } from "@antumbra/domain-settings/queries/counts.ts";
import { SettingsRow } from "@antumbra/glass-components/compositions/settings-row.tsx";
import { editablesOf } from "@antumbra/glass-components/fields.ts";
import { changing, sending, useGenerated } from "@antumbra/glass-components/generated.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { SaveAction } from "@antumbra/glass-components/save-action.tsx";
import { SettingsField } from "@antumbra/glass-components/settings-field.tsx";
import { useField, useSubmit } from "@antumbra/glass-form/react.ts";
import { useAtomRef } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId, useMemo } from "react";
import type { SettingsApi } from "#glass.ts";

const COUNT = "count";

const FIXED = ["key"] as const;

const KEPT = () => undefined;

export const CountRow = ({ api, row }: { readonly api: SettingsApi; readonly row: typeof CountReading.Type }) => {
	const named = useId();
	const said = useId();
	const titled = useId();
	const editables = useMemo(() => editablesOf(api.settings.setCount.command, FIXED), [api]);
	const send = useMemo(() => sending(api.settings.setCount), [api]);
	const form = useGenerated(editables, { key: row.key }, { count: row.count }, send, KEPT);
	const values = useAtomRef(form.values);
	const field = useField(form, COUNT);
	const submit = useSubmit(form);
	const change = changing(form, editables);
	const refused = AsyncResult.isFailure(submit.result) && !submit.result.waiting ? messageOf(submit.result.cause) : null;
	const wrong = field.error ?? refused;
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
