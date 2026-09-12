import { type Connecting, mount } from "@antumbra/glass-renderer/mount.tsx";
import type { ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { Effect } from "effect";

export const host = (container: HTMLElement, bridge: ShellBridge | undefined, connecting: Connecting) => {
	if (bridge === undefined) {
		container.textContent =
			"Open this harness through the desktop shell with --renderer-url=http://localhost:5184. It uses the running application, including its windows, drafts, and restart controls.";
		return;
	}
	Effect.runFork(Effect.scoped(mount(container, bridge, connecting)));
};
