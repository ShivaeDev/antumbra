import { DraftRef } from "@antumbra/platform-shell/bridge.ts";
import * as Channel from "@antumbra/platform-shell/channels.ts";
import { WindowPlace } from "@antumbra/platform-shell/windows.ts";
import { Effect, Schema } from "effect";
import { BrowserWindow, ipcMain } from "electron";
import { appInfo } from "#adapters/app-info.ts";
import { ShellDrafts } from "#adapters/drafts.ts";
import { ServerProcess } from "#adapters/server-process.ts";
import type { WindowRegistry } from "#adapters/windows/registry.ts";
import { RequestOrigin, WindowSource } from "#adapters/windows/source.ts";

export const registerShellBridge = (registry: WindowRegistry, restart: () => Promise<void>) =>
	Effect.gen(function* () {
		const context = yield* Effect.context<ServerProcess | ShellDrafts | WindowSource>();
		const run = Effect.runPromiseWith(context);
		const owner = (event: Electron.IpcMainInvokeEvent) => {
			const window = registry.owner(event);
			if (window === undefined) throw new Error("unauthorized bridge sender");
			return window.id;
		};
		ipcMain.handle(Channel.SERVER_CHANNEL, (event) => {
			owner(event);
			return run(ServerProcess.use((source) => source.serving));
		});
		ipcMain.handle(Channel.APP_INFO_CHANNEL, (event) => {
			owner(event);
			return Effect.runPromise(appInfo);
		});
		ipcMain.handle(Channel.RESTART_CHANNEL, (event) => {
			owner(event);
			return restart();
		});
		ipcMain.handle(Channel.WINDOW_PLACE_CHANNEL, (event) =>
			run(WindowSource.use((source) => source.place).pipe(Effect.provideService(RequestOrigin, { windowId: owner(event) }))),
		);
		ipcMain.handle(Channel.REMEMBER_PLACE_CHANNEL, (event, raw: unknown) =>
			run(
				WindowSource.use((source) => source.remember(Schema.decodeUnknownSync(WindowPlace)(raw))).pipe(
					Effect.provideService(RequestOrigin, { windowId: owner(event) }),
				),
			),
		);
		ipcMain.handle(Channel.OPEN_WINDOW_CHANNEL, (event, raw: unknown) =>
			run(
				WindowSource.use((source) => source.open(Schema.decodeUnknownSync(WindowPlace)(raw))).pipe(
					Effect.provideService(RequestOrigin, { windowId: owner(event) }),
				),
			),
		);
		ipcMain.handle(Channel.READ_DRAFT_CHANNEL, (event, raw: unknown, legacy: unknown) => {
			owner(event);
			return run(
				ShellDrafts.use((source) =>
					source.read(Schema.decodeUnknownSync(DraftRef)(raw), Schema.decodeUnknownSync(Schema.NullOr(Schema.String))(legacy) ?? undefined),
				),
			);
		});
		ipcMain.handle(Channel.WRITE_DRAFT_CHANNEL, (event, raw: unknown, text: unknown) => {
			owner(event);
			return run(ShellDrafts.use((source) => source.write(Schema.decodeUnknownSync(DraftRef)(raw), Schema.decodeUnknownSync(Schema.String)(text))));
		});
		ipcMain.handle(Channel.CLEAR_DRAFT_CHANNEL, (event, raw: unknown, revision: unknown) => {
			owner(event);
			return run(
				ShellDrafts.use((source) => source.clear(Schema.decodeUnknownSync(DraftRef)(raw), Schema.decodeUnknownSync(Schema.String)(revision))),
			);
		});
		return yield* ShellDrafts.use((source) =>
			Effect.sync(() =>
				source.onChanged((ref, snapshot) => {
					for (const window of BrowserWindow.getAllWindows())
						if (registry.owner({ sender: window.webContents }) !== undefined) window.webContents.send(Channel.DRAFT_CHANGED_CHANNEL, ref, snapshot);
				}),
			),
		);
	});
