import type { Settings, UpdateSettings } from "@antumbra/contract";
import { client, toError } from "#adapters/bridge.ts";

export const loadSettings = (
	onDone: (settings: Settings) => void,
	onError: (message: string) => void,
): void => {
	client.settings
		.query()
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const saveSettings = (
	settings: UpdateSettings,
	onDone: (saved: Settings) => void,
	onError: (message: string) => void,
): void => {
	client.updateSettings
		.mutate(settings)
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};
