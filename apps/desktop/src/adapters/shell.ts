import { mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { Config, Effect } from "effect";
import { app } from "electron";
import { registerGracefulShutdown } from "#adapters/graceful-shutdown.ts";
import type { OwnedWindow } from "#adapters/windows/registry.ts";

export const DEV_USER_DATA_VARIABLE = "ANTUMBRA_DEV_USER_DATA";

export const whenReady = Effect.promise(() => app.whenReady());

interface DataDirectoryInput {
	readonly appData: string;
	readonly devOverride: string | undefined;
	readonly isPackaged: boolean;
}

// why: dev and packaged runs must never share a data directory — a dev
// session migrating ahead of the installed app would corrupt real state.
// The override lets several dev instances hold separate state (Electron
// scopes the single-instance lock per userData path); a packaged build
// ignores it unconditionally, whatever the environment says. A set but
// relative value is refused rather than resolved, because a directory that
// depends on the working directory is the collision this exists to prevent.
export const selectDataDirectory = (input: DataDirectoryInput): string => {
	if (input.isPackaged) {
		return join(input.appData, "Antumbra");
	}
	if (input.devOverride === undefined || input.devOverride === "") {
		return join(input.appData, "Antumbra-Dev");
	}
	if (!isAbsolute(input.devOverride)) {
		throw new Error(`${DEV_USER_DATA_VARIABLE} must be an absolute path`);
	}
	return input.devOverride;
};

const devUserDataOverride = Config.string(DEV_USER_DATA_VARIABLE).pipe(
	Config.withDefault(""),
);

export const configureDataDirectory = (): string => {
	const directory = selectDataDirectory({
		appData: app.getPath("appData"),
		devOverride: Effect.runSync(devUserDataOverride),
		isPackaged: app.isPackaged,
	});
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

// why: a launch handed to the owner and a click on the menu bar are the same
// request — the app the admiral already has, which is the console. Never
// whichever detached window sorts first, and never a second console.
export const focusOrOpenConsole = (
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
