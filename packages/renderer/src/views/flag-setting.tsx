import type { SettingDeclaration, SettingKey, SettingsReading } from "@antumbra/contract";
import { Schema } from "effect";
import { useRequestForm } from "#adapters/form.ts";
import { changeSetting } from "#adapters/trpc-settings.ts";
import { RequestForm } from "#forms/view.tsx";

export const FlagSetting = ({
	declaration,
	settingKey,
	value,
	onSettings,
}: {
	readonly declaration: Extract<SettingDeclaration, { readonly kind: "flag" }>;
	readonly settingKey: SettingKey;
	readonly value: boolean;
	readonly onSettings: (reading: SettingsReading) => void;
}) => {
	const form = useRequestForm({
		defaultValues: { value },
		schema: Schema.Struct({ value: declaration.value }),
		request: (draft) => changeSetting({ key: settingKey, value: draft.value }),
		resetAfterSuccess: (draft) => draft,
		onSuccess: onSettings,
	});
	return (
		<RequestForm form={form}>
			<form.AppField
				name="value"
				listeners={{
					onChange: () => {
						void form.handleSubmit();
					},
				}}
			>
				{(field) => (
					<field.CheckboxField
						label={<span className="text-sm font-medium">{declaration.title}</span>}
						checked={value}
						className="size-4 accent-primary"
					/>
				)}
			</form.AppField>
		</RequestForm>
	);
};
