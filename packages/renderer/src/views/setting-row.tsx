import { SETTINGS, type SettingKey, type SettingValue } from "@antumbra/contract";
import { useId } from "react";
import { CountField, FlagField } from "#views/setting-fields.tsx";

export const SettingRow = ({
	onChange,
	overridden,
	settingKey,
	value,
}: {
	readonly onChange: (value: SettingValue) => void;
	readonly overridden: boolean;
	readonly settingKey: SettingKey;
	readonly value: SettingValue;
}) => {
	const declaration = SETTINGS[settingKey];
	const id = useId();
	return (
		<div className="flex flex-col gap-3 rounded-md border border-border p-4">
			<label className="text-sm font-medium" htmlFor={id}>
				{declaration.title}
			</label>
			<p className="text-xs text-muted-foreground">{declaration.description}</p>
			{declaration.kind === "flag" ? (
				<FlagField checked={value === true} id={id} onChange={onChange} />
			) : (
				<CountField declaration={declaration} id={id} onChange={onChange} value={Number(value)} />
			)}
			<p className="text-2xs text-muted-foreground">
				{overridden
					? `Set by you. Antumbra's own value is ${String(declaration.fallback)}.`
					: `Antumbra's own value. Expects ${declaration.expects}.`}
			</p>
		</div>
	);
};
