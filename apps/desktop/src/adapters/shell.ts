import { mkdirSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { Config, Effect, type Ref } from "effect";
import { app } from "electron";
import { registerGracefulShutdown } from "#adapters/graceful-shutdown.ts";
import type { OwnedWindow } from "#adapters/windows/registry.ts";
import { RESTART_EXIT_CODE } from "#restart-exit-code.ts";

const DEV_USER_DATA_VARIABLE = "ANTUMBRA_DEV_USER_DATA";

export const whenReady = Effect.promise(() => app.whenReady());

interface DataDirectoryInput {
	readonly appData: string;
	readonly devOverride: string | undefined;
	readonly isPackaged: boolean;
}

// Electron scopes its single-instance lock by userData path, so development and packaged runs use separate directories.
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

const devUserDataOverride = Config.string(DEV_USER_DATA_VARIABLE).pipe(Config.withDefault(""));

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

export {
	artifactsInDataDirectory,
	runnerRootsInDataDirectory,
	sessionInputsInDataDirectory,
	windowLayoutInDataDirectory,
} from "#adapters/data-paths.ts";

export const persistenceMigrationsDirectory = (): string =>
	app.isPackaged ? join(process.resourcesPath, "persistence", "migrations") : join(import.meta.dirname, "persistence", "migrations");

export const quitWhenAllWindowsClosed = Effect.sync(() => {
	app.on("window-all-closed", () => {
		app.quit();
	});
});

export const drainBeforeQuit = <E>(shutdown: Effect.Effect<void, E>, restarting: Ref.Ref<boolean>) =>
	registerGracefulShutdown(
		{
			onBeforeQuit: (listener) => {
				app.on("before-quit", listener);
			},
			quit: () => app.quit(),
			relaunch: () => {
				if (app.isPackaged) {
					app.relaunch();
					app.quit();
					return;
				}
				app.exit(RESTART_EXIT_CODE);
			},
		},
		shutdown,
		restarting,
	);

interface ConsoleWindows {
	readonly consoleWindow: () => OwnedWindow | undefined;
}

interface DesktopApplication {
	readonly onSecondInstance: (listener: () => void) => void;
	readonly quit: () => void;
	readonly requestSingleInstanceLock: () => boolean;
}

export const focusOrOpenConsole = (registry: ConsoleWindows, openConsole: Effect.Effect<void>) =>
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

export const claimDesktopOwnership = (application: DesktopApplication, registry: ConsoleWindows, openConsole: Effect.Effect<void>) =>
	Effect.sync(() => {
		if (!application.requestSingleInstanceLock()) {
			application.quit();
			return false;
		}
		application.onSecondInstance(() => {
			focusOrOpenConsole(registry, openConsole).pipe(
				Effect.catchCause((cause) => Effect.logError("second launch handoff failed", cause)),
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
