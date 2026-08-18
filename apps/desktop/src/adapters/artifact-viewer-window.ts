import { Buffer } from "node:buffer";
import { join } from "node:path";
import { Data, Effect } from "effect";
import { BrowserWindow } from "electron";
import type { ArtifactViewerInput } from "#viewer/model.ts";

export class ArtifactViewerFailed extends Data.TaggedError(
	"ArtifactViewerFailed",
)<{ readonly detail: string }> {}

export const encodeArtifactPresentation = (
	input: ArtifactViewerInput,
): string => Buffer.from(JSON.stringify(input), "utf8").toString("base64");

const presentationScript = (input: ArtifactViewerInput): string => {
	const encoded = encodeArtifactPresentation(input);
	return `globalThis.presentArtifact(JSON.parse(new TextDecoder().decode(Uint8Array.from(atob("${encoded}"), character => character.charCodeAt(0)))))`;
};

const openWindow = async (input: ArtifactViewerInput): Promise<void> => {
	const window = new BrowserWindow({
		height: 760,
		show: false,
		title: input.title,
		webPreferences: { sandbox: true },
		width: 960,
	});
	try {
		await window.loadFile(
			join(import.meta.dirname, "artifact-viewer", "index.html"),
		);
		await window.webContents.executeJavaScript(presentationScript(input));
		window.show();
	} catch (cause) {
		window.destroy();
		throw cause;
	}
};

export const openArtifactViewer = (
	input: ArtifactViewerInput,
): Effect.Effect<void, ArtifactViewerFailed> =>
	Effect.tryPromise({
		try: () => openWindow(input),
		catch: (cause) =>
			new ArtifactViewerFailed({
				detail:
					cause instanceof Error ? cause.message : "Artifact viewer failed",
			}),
	});
