import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import type { Request } from "@antumbra/platform-vocabulary/id.ts";
import type { RoleSettingsEvent } from "@antumbra/platform-vocabulary/role-settings-event.ts";
import { Effect } from "effect";
import { checkRequest as receipt } from "#receipt.ts";
import type { History } from "#role-settings/initialize.ts";
export const append = (history: History) =>
	Effect.fn("RoleSettingsHistory.append")(function* (requestId: Request, events: readonly (typeof RoleSettingsEvent.Type)[]) {
		const current = yield* history.store.read("role-settings");
		return yield* history.store
			.append({ stream: "role-settings", requestId, expectedVersion: current.at(-1)?.streamVersion ?? 0, events })
			.pipe(Effect.catchTag("AlreadyDone", (done) => Effect.fail(new AlreadyDone({ requestId: done.requestId, seq: done.streamVersion }))));
	});
export const read = (history: History) =>
	Effect.fn("RoleSettingsHistory.read")(function* () {
		return yield* history.store.read("role-settings");
	});
export const rebuild = (history: History) =>
	Effect.fn("RoleSettingsHistory.rebuild")(function* () {
		yield* history.store.rebuild;
	});

export const readRows = (history: History) => Effect.fn("RoleSettingsHistory.rows")(() => Effect.succeed(history.rows));
export const checkRequest = receipt("role-settings");
