import { SETTINGS, type SettingKey, type SettingsReading, type SettingValue } from "@antumbra/contract";
import { CountSetting } from "#views/count-setting.tsx";
import { FlagSetting } from "#views/flag-setting.tsx";

export const SettingRow = ({
	onSettings,
	overridden,
	settingKey,
	value,
}: {
	readonly onSettings: (reading: SettingsReading) => void;
	readonly overridden: boolean;
	readonly settingKey: SettingKey;
	readonly value: SettingValue;
}) => {
	const declaration = SETTINGS[settingKey];
	return (
		<div className="flex flex-col gap-3 rounded-md border border-border p-4">
			{declaration.kind === "flag" ? (
				<FlagSetting declaration={declaration} settingKey={settingKey} value={value === true} onSettings={onSettings} />
			) : (
				<CountSetting declaration={declaration} settingKey={settingKey} key={Number(value)} onSettings={onSettings} value={Number(value)} />
			)}
			<p className="text-xs text-muted-foreground">{declaration.description}</p>
			<p className="text-2xs text-muted-foreground">
				{overridden
					? `Set by you. Antumbra's own value is ${String(declaration.fallback)}.`
					: `Antumbra's own value. Expects ${declaration.expects}.`}
			</p>
		</div>
	);
};
