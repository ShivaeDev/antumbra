import { makeAppRouter } from "@antumbra/contract";
import { makeRuntime, scriptedFeeds } from "@antumbra/contract/fixtures";
import { mount } from "#adapters/mount.tsx";
import { makeBrowserBridge } from "#adapters/router-bridge.ts";
import { installBridge } from "#install.ts";

const container = document.getElementById("root");
if (container !== null) {
	installBridge(makeBrowserBridge(makeAppRouter(makeRuntime(scriptedFeeds))));
	void mount(container);
}
