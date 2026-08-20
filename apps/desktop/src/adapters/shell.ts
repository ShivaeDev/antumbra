import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { Effect } from "effect";
import { app } from "electron";
import { registerGracefulShutdown } from "#adapters/graceful-shutdown.ts";
import type { OwnedWindow } from "#adapters/windows/registry.ts";

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
): { readonly moorageRoot: string; readonly reposRoot: string } => ({
	moorageRoot: join(dataDirectory, "moorage"),
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

interface ConsoleWindows {
	readonly consoleWindow: () => OwnedWindow | undefined;
}

interface DesktopApplication {
	readonly onSecondInstance: (listener: () => void) => void;
	readonly quit: () => void;
	readonly requestSingleInstanceLock: () => boolean;
}

// why: a second launch is a request for the app the admiral already has, and
// the app is the console — never whichever detached window happens to sort
// first, and never a second console beside the one already open.
const focusOrOpenConsole = (
	registry: ConsoleWindows,
	openConsole: Effect.Effect<void>,
) =>
	Effect.gen(function* () {
		const window = registry.consoleWindow()?.handle;
		if (window === undefined) {
			yield* openConsole;
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
	registry: ConsoleWindows,
	openConsole: Effect.Effect<void>,
) =>
	Effect.sync(() => {
		if (!application.requestSingleInstanceLock()) {
			application.quit();
			return false;
		}
		application.onSecondInstance(() => {
			focusOrOpenConsole(registry, openConsole).pipe(
				Effect.catchCause((cause) =>
					Effect.logError("second launch handoff failed", cause),
				),
				Effect.runFork,
			);
		});
		return true;
	});

export const desktopApplication: DesktopApplication = {
	onSecondInstance: (listener) => {
		app.on("second-instance", listener);
	},
	quit: () => app.quit(),
	requestSingleInstanceLock: () => app.requestSingleInstanceLock(),
};
