import { Effect } from "effect";
import { restorePlan } from "#adapters/windows/layout.ts";
import type { LayoutStore } from "#adapters/windows/layout-store.ts";
import { openWindow } from "#adapters/windows/open.ts";
import type { OwnedWindow, WindowShell } from "#adapters/windows/registry.ts";

const raise = (record: OwnedWindow): Effect.Effect<void> =>
	Effect.sync(() => {
		record.handle.show();
		record.handle.focus();
	});

export const restoreWindows = (shell: WindowShell, store: LayoutStore) =>
	Effect.gen(function* () {
		const plan = restorePlan(yield* store.load);
		const reopened = new Map<string, OwnedWindow>();
		const consoleWindow = yield* openWindow({
			...shell,
			place: plan.consoleWindow.place,
		});
		reopened.set(plan.consoleWindow.id, consoleWindow);
		for (const child of plan.children) {
			yield* openWindow({ ...shell, place: child.place }).pipe(
				Effect.tap((record) => Effect.sync(() => reopened.set(child.id, record))),
				Effect.catchCause((cause) => Effect.logWarning("bridge: a remembered window did not reopen", cause)),
			);
		}
		yield* raise((plan.focused === null ? undefined : reopened.get(plan.focused)) ?? consoleWindow);
	});
