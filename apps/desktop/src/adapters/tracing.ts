import { join } from "node:path";
import { localTracing } from "@shivaedev/server/localTracing.ts";
import { type Clock, Layer } from "effect";
import { app } from "electron";
import { configureDataDirectory } from "#adapters/shell.ts";

export const indexedAttributes = ["sessionId", "agentId", "intentId", "pieceId"];
export const selectDevTracing = (input: { readonly dataDirectory: string; readonly isPackaged: boolean; readonly clock?: Clock.Clock }) =>
	input.isPackaged
		? Layer.empty
		: localTracing({ path: join(input.dataDirectory, "traces.db"), indexedAttributes, ...(input.clock === undefined ? {} : { clock: input.clock }) });

export const devTracing = () => selectDevTracing({ dataDirectory: configureDataDirectory(), isPackaged: app.isPackaged });
