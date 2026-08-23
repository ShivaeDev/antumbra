import { SETTING_KEYS, type SettingsReading } from "@antumbra/contract";
import { useEffect, useState } from "react";
import { changeSetting, loadSettings } from "#adapters/trpc-settings.ts";
import { SettingRow } from "#views/setting-row.tsx";

// why: the panel draws the catalog rather than a list of its own. A setting
// declared there arrives here with its title, its sentence and its control
// already decided, so nothing in this file is edited to show it.
export const SettingsPanel = ({
	onError,
}: {
	readonly onError: (message: string) => void;
}) => {
	const [reading, setReading] = useState<SettingsReading | undefined>(
		undefined,
	);

	useEffect(() => {
		loadSettings(setReading, onError);
	}, [onError]);

	return (
		<section className="flex max-w-2xl flex-1 flex-col gap-6 overflow-y-auto p-8">
			<header>
				<h2 className="text-lg font-medium">Settings</h2>
				<p className="mt-1 text-xs text-muted-foreground">
					Changes take effect on the next pass of the work they govern. Running
					sessions are not interrupted.
				</p>
			</header>
			{reading === undefined ? (
				<p className="text-xs text-muted-foreground">Reading settings…</p>
			) : (
				SETTING_KEYS.map((key) => (
					<SettingRow
						key={key}
						onChange={(value) =>
							changeSetting({ key, value }, setReading, onError)
						}
						overridden={reading.overridden.includes(key)}
						settingKey={key}
						value={reading.settings[key]}
					/>
				))
			)}
		</section>
	);
};
