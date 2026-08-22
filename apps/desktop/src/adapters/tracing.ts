import { DevTraceLive } from "@antumbra/trace-sink";
import { Layer } from "effect";
import { app } from "electron";
import { configureDataDirectory } from "#adapters/shell.ts";

interface DevTracingInput {
	readonly appVersion: string;
	readonly dataDirectory: string;
	readonly isPackaged: boolean;
}

// why: tracing is a dev instrument and stays one. A packaged run installs no
// tracer, adds no second logger, and writes no trace database, so a release
// carries none of the cost; the decision is taken here, as a value, so it can
// be read and tested without an Electron application to ask.
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
