import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { app, BrowserWindow } from "electron";
import { registerGracefulShutdown } from "#adapters/graceful-shutdown.ts";
import { openMainWindow } from "#adapters/main-window.ts";

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

export const artifactsInDataDirectory = (dataDirectory: string): string =>
	join(dataDirectory, "artifacts");

export const persistenceMigrationsDirectory = (): string =>
	app.isPackaged
		? join(process.resourcesPath, "persistence", "migrations")
		: join(import.meta.dirname, "persistence", "migrations");

export const quitWhenAllWindowsClosed = Effect.sync(() => {
	app.on("window-all-closed", () => {
		app.quit();
	});
});

export const drainBeforeQuit = <E>(shutdown: Effect.Effect<void, E>) =>
	registerGracefulShutdown(
		{
			onBeforeQuit: (listener) => {
				app.on("before-quit", listener);
			},
			quit: () => app.quit(),
		},
		shutdown,
	);

interface DesktopApplication {
	readonly onSecondInstance: (listener: () => void) => void;
	readonly quit: () => void;
	readonly requestSingleInstanceLock: () => boolean;
}

interface OwnedWindow {
	readonly focus: () => void;
	readonly isMinimized: () => boolean;
	readonly restore: () => void;
	readonly show: () => void;
}

interface OwnedWindows {
	readonly getAllWindows: () => ReadonlyArray<OwnedWindow>;
}

const focusOrOpenOwnedWindow = (windows: OwnedWindows) =>
	Effect.gen(function* () {
		const window = windows.getAllWindows()[0];
		if (window === undefined) {
			yield* openMainWindow();
			return;
		}
		if (window.isMinimized()) {
			window.restore();
		}
		window.show();
		window.focus();
	});

export const claimDesktopOwnership = (
	application: DesktopApplication,
	windows: OwnedWindows,
) =>
	Effect.sync(() => {
		if (!application.requestSingleInstanceLock()) {
			application.quit();
			return false;
		}
		application.onSecondInstance(() => {
			focusOrOpenOwnedWindow(windows).pipe(
				Effect.catchCause((cause) =>
					Effect.logError("second launch handoff failed", cause),
				),
				Effect.runFork,
			);
		});
		return true;
	});

export const acquireDesktopOwnership = claimDesktopOwnership(
	{
		onSecondInstance: (listener) => {
			app.on("second-instance", listener);
		},
		quit: () => app.quit(),
		requestSingleInstanceLock: () => app.requestSingleInstanceLock(),
	},
	BrowserWindow,
);
