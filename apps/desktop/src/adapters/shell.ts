import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { app, BrowserWindow } from "electron";

const RENDERER_URL_FLAG = "--renderer-url=";

export const whenReady = Effect.promise(() => app.whenReady());

// why: dev and packaged runs must never share a data directory — a dev
// session migrating ahead of the installed app would corrupt real state.
export const configureDataDirectory = (): string => {
	const scope = app.isPackaged ? "Antumbra" : "Antumbra-Dev";
	const directory = join(app.getPath("appData"), scope);
	app.setPath("userData", directory);
	mkdirSync(directory, { recursive: true });
	return directory;
};

export const runnerRootsInDataDirectory = (
	dataDirectory: string,
): { readonly berthsRoot: string; readonly reposRoot: string } => ({
	berthsRoot: join(dataDirectory, "berths"),
	reposRoot: join(dataDirectory, "repos"),
});

export const persistenceMigrationsDirectory = (): string =>
	app.isPackaged
		? join(process.resourcesPath, "persistence", "migrations")
		: join(import.meta.dirname, "persistence", "migrations");

export const quitWhenAllWindowsClosed = Effect.sync(() => {
	app.on("window-all-closed", () => {
		app.quit();
	});
});

const rendererUrl = (): string | undefined =>
	process.argv
		.find((argument) => argument.startsWith(RENDERER_URL_FLAG))
		?.slice(RENDERER_URL_FLAG.length);

export const openMainWindow = Effect.promise(() => {
	const window = new BrowserWindow({
		height: 760,
		title: "Antumbra",
		webPreferences: {
			contextIsolation: true,
			preload: join(import.meta.dirname, "preload.cjs"),
			sandbox: true,
		},
		width: 1120,
	});
	const url = rendererUrl();
	return url === undefined
		? window.loadFile(join(import.meta.dirname, "renderer", "index.html"))
		: window.loadURL(url);
});
