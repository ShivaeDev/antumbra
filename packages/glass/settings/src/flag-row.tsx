import type { FlagReading } from "@antumbra/domain-settings/queries/flags.ts";
import { SettingsRow } from "@antumbra/glass-components/compositions/settings-row.tsx";
import { editablesOf } from "@antumbra/glass-components/fields.ts";
import { changing, sending, useGenerated } from "@antumbra/glass-components/generated.ts";
import { messageOf } from "@antumbra/glass-components/refusal.ts";
import { SettingsField } from "@antumbra/glass-components/settings-field.tsx";
import { useSubmit } from "@antumbra/glass-form/react.ts";
import { useAtomRef } from "@effect/atom-react";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import { useId, useMemo } from "react";
import type { SettingsApi } from "#glass.ts";

const FIXED = ["key"] as const;

const KEPT = () => undefined;

export const FlagRow = ({ api, row }: { readonly api: SettingsApi; readonly row: typeof FlagReading.Type }) => {
	const named = useId();
	const said = useId();
	const titled = useId();
	const editables = useMemo(() => editablesOf(api.settings.setFlag.command, FIXED), [api]);
	const send = useMemo(() => sending(api.settings.setFlag), [api]);
	const form = useGenerated(editables, { key: row.key }, { on: row.on }, send, KEPT);
	const values = useAtomRef(form.values);
	const submit = useSubmit(form);
	const changed = changing(form, editables);
	const refused = AsyncResult.isFailure(submit.result) && !submit.result.waiting ? messageOf(submit.result.cause) : null;
	const change = (name: string, value: unknown): void => {
		changed(name, value);
		submit.run();
	};
	const control = editables.map((editable) => (
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
	));
	return (
		<form
			aria-labelledby={titled}
			onSubmit={(event) => {
				event.preventDefault();
				submit.run();
			}}
		>
			<SettingsRow control={control} help={row.description} htmlFor={named} label={row.title} labelId={titled} />
			{refused === null ? null : (
				<p className="pb-3 text-xs text-destructive" id={said} role="alert">
					{refused}
				</p>
			)}
		</form>
	);
};
