import type { SettingCount, SettingKey, SettingsReading } from "@antumbra/contract";
import { useStore } from "@tanstack/react-form";
import { Schema, SchemaGetter } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { changeSetting } from "#adapters/trpc-settings.ts";
import { RequestForm } from "#forms/view.tsx";

export const CountSetting = ({
	declaration,
	settingKey,
	value,
	onSettings,
}: {
	readonly declaration: SettingCount;
	readonly settingKey: SettingKey;
	readonly value: number;
	readonly onSettings: (reading: SettingsReading) => void;
}) => {
	const count = Schema.String.pipe(
		Schema.decodeTo(declaration.value, {
			decode: SchemaGetter.transform(Number),
			encode: SchemaGetter.transform(String),
		}),
	);
	const form = useRequestForm({
		defaultValues: { value: String(value) },
		schema: Schema.Struct({ value: count }).check(Schema.makeFilter((draft) => (draft.value === value ? "Choose a different value" : undefined))),
		request: (draft) => changeSetting({ key: settingKey, value: draft.value }),
		resetAfterSuccess: (draft) => draft,
		onSuccess: onSettings,
	});
	const unmoved = useStore(form.store, (state) => Number(state.values.value) === value);
	return (
		<RequestForm form={form}>
			<div className="flex items-end gap-2">
				<form.AppField name="value">
					{(field) => (
						<field.TextField
							label={<span className="text-sm font-medium">{declaration.title}</span>}
							className="w-28"
							type="number"
							min={declaration.least}
							max={declaration.most}
							step={1}
						/>
					)}
				</form.AppField>
				<form.Submit disabled={unmoved} pending="Saving…">
					Save
				</form.Submit>
			</div>
		</RequestForm>
	);
};
