import type { ReadHandles } from "@antumbra/platform-feature/handles.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { SettingsEvent } from "@antumbra/platform-vocabulary/settings-event.ts";
import { Effect } from "effect";
import { checkRequest as receipt } from "#postgres/receipt.ts";
import type { History } from "#postgres/settings/initialize.ts";
import type { count, flag } from "#postgres/settings/rows.ts";
export const append = (history: History) =>
	Effect.fn("SettingsHistory.append")(function* (requestId: Request, events: readonly (typeof SettingsEvent.Type)[]) {
		const current = yield* history.store.read("settings");
		return yield* history.store
			.append({ stream: "settings", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("SettingsHistory.read")(function* () {
		return yield* history.store.read("settings");
	});
export const rebuild = (history: History) =>
	Effect.fn("SettingsHistory.rebuild")(function* () {
		yield* history.store.rebuild;
	});

export const readRows = (history: History) =>
	Effect.fn("SettingsHistory.rows")(() => Effect.succeed<ReadHandles<readonly [typeof flag, typeof count]>>(history.rows));
export const checkRequest = receipt("settings");
