import { DevTraceLive } from "@antumbra/trace-sink";
import { Layer } from "effect";
import { app } from "electron";
import { configureDataDirectory } from "#adapters/shell.ts";

interface DevTracingInput {
	readonly appVersion: string;
	readonly dataDirectory: string;
	readonly isPackaged: boolean;
}

export const selectDevTracing = (input: DevTracingInput): Layer.Layer<never> =>
	input.isPackaged
		? Layer.empty
		: DevTraceLive({
				appVersion: input.appVersion,
				dataDirectory: input.dataDirectory,
			});

export const devTracing = (): Layer.Layer<never> =>
	selectDevTracing({
		appVersion: app.getVersion(),
		dataDirectory: configureDataDirectory(),
		isPackaged: app.isPackaged,
	});
