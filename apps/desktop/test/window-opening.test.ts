import { expect, it } from "@effect/vitest";
import { Effect, Exit } from "effect";
import { vi } from "vitest";
import { openWindow } from "#adapters/windows/open.ts";
import { makeWindowRegistry } from "#adapters/windows/registry.ts";
import { consolePlace } from "#test/windows.ts";

const electron = vi.hoisted(() => ({
	navigate: (_sender: { isDestroyed: () => boolean }): Promise<void> => Promise.resolve(),
	crash: () => {},
	closed: false,
}));

vi.mock("electron", () => {
	class Events {
		listeners = new Map<string, () => void>();
		on(name: string, listener: () => void) {
			this.listeners.set(name, listener);
		}
		emit(name: string) {
			this.listeners.get(name)?.();
		}
	}

	class BrowserWindow extends Events {
		webContents = Object.assign(new Events(), {
			isDestroyed: () => false,
			setWindowOpenHandler: () => {},
			reload: () => {
				void electron.navigate(this.webContents);
			},
		});
		constructor() {
			super();
			electron.closed = false;
			electron.crash = () => {
				this.webContents.emit("render-process-gone");
			};
		}
		loadURL() {
			return electron.navigate(this.webContents);
		}
		close() {
			electron.closed = true;
			this.emit("closed");
		}
	}
	return { app: {}, BrowserWindow, shell: {} };
});

it.effect("authorizes the renderer's first request during initial navigation and crash recovery", () =>
	Effect.gen(function* () {
		const registry = makeWindowRegistry();
		const places: unknown[] = [];
		electron.navigate = (sender) => {
			const owner = registry.owner({ sender });
			expect(owner).toBeDefined();
			places.push(owner?.place);
			return Promise.resolve();
		};
		const record = yield* openWindow({ document: "file:///app/index.html", registry, place: consolePlace });
		const remembered = { ...consolePlace, mode: "quay" as const };
		registry.remember(record.id, remembered);
		electron.crash();
		expect(places).toEqual([consolePlace, remembered]);
		expect(registry.all()).toHaveLength(1);
	}),
);

it.effect("releases ownership and closes the native window when initial navigation fails", () =>
	Effect.gen(function* () {
		const registry = makeWindowRegistry();
		electron.navigate = () => Promise.reject(new Error("document unavailable"));
		const result = yield* Effect.exit(openWindow({ document: "file:///missing.html", registry, place: consolePlace }));
		expect(Exit.isFailure(result)).toBe(true);
		expect(registry.all()).toEqual([]);
		expect(electron.closed).toBe(true);
	}),
);
