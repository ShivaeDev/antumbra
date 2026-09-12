import { connect } from "@antumbra/glass-client/connect.ts";
import { mount } from "@antumbra/glass-renderer/mount.tsx";
import type { ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { features } from "@antumbra/server/features.ts";
import { Effect } from "effect";
import "@antumbra/glass-components/styles/theme.css";

declare global {
	interface Window {
		readonly antumbra: ShellBridge;
	}
}

const container = document.getElementById("root");
if (container !== null) {
	Effect.runFork(Effect.scoped(mount(container, window.antumbra, connect(features))));
}
