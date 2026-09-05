import { SETTING_KEYS, type SettingsReading } from "@antumbra/contract";
import { RestartControl } from "#views/restart-control.tsx";
import { SettingRow } from "#views/setting-row.tsx";

export const SettingsPanel = ({
	onError,
	onSettings,
	settings,
}: {
	readonly onError: (message: string) => void;
	readonly onSettings: (settings: SettingsReading) => void;
	readonly settings: SettingsReading | undefined;
}) => {
	return (
		<section className="flex max-w-2xl flex-1 flex-col gap-6 overflow-y-auto p-8">
			<header>
				<h2 className="text-lg font-medium">Settings</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Changes take effect on the next pass of the work they govern. Running sessions are not interrupted.
				</p>
			</header>
			{settings === undefined ? (
				<p className="text-xs text-muted-foreground">Reading settings…</p>
			) : (
				SETTING_KEYS.map((key) => (
					<SettingRow
						key={key}
						onSettings={onSettings}
						overridden={settings.overridden.includes(key)}
						settingKey={key}
						value={settings.settings[key]}
					/>
				))
			)}
			<RestartControl onError={onError} />
		</section>
	);
};
