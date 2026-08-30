import type { SettingChange, SettingsReading } from "@antumbra/contract";
import { client, toError } from "#adapters/bridge.ts";

export const loadSettings = (onDone: (reading: SettingsReading) => void, onError: (message: string) => void): void => {
	client.settings
		.query()
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const changeSetting = (change: SettingChange, onDone: (reading: SettingsReading) => void, onError: (message: string) => void): void => {
	client.changeSetting
		.mutate(change)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};
