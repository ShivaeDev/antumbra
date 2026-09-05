import type { SettingChange, SettingsReading } from "@antumbra/contract";
import { Effect } from "effect";
import { client, toError } from "#adapters/bridge.ts";
import { RendererRequestError } from "#adapters/request-error.ts";

export const loadSettings = (onDone: (reading: SettingsReading) => void, onError: (message: string) => void): void => {
	client.settings
		.query()
		.then(onDone)
		.catch((cause: unknown) => onError(toError(cause).message));
};

export const changeSetting = Effect.fn("Renderer.changeSetting")((change: SettingChange) =>
	Effect.tryPromise({
		try: () => client.changeSetting.mutate(change),
		catch: (cause) => new RendererRequestError({ message: toError(cause).message }),
	}),
);
