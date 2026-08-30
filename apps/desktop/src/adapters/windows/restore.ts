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

// why: a restore is a best effort at the shape the app was left in, never a
// gate on it starting. The console is the app, so a console that will not open
// is still fatal; a child that will not is worth a line in the log and nothing
// more, because the work it was watching is not in the window.
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
		// why: the windows are opened in the order they were written down, so
		// whichever was in front is put back in front once they all exist.
		yield* raise((plan.focused === null ? undefined : reopened.get(plan.focused)) ?? consoleWindow);
	});
