import { connect } from "@antumbra/glass-client/connect.ts";
import { host } from "@antumbra/glass-harness/host.ts";
import type { ShellBridge } from "@antumbra/platform-shell/bridge.ts";
import { features } from "@antumbra/server/features.ts";
import "@antumbra/glass-components/styles/theme.css";

declare global {
	interface Window {
		readonly antumbra: ShellBridge;
	}
}

const container = document.getElementById("root");
if (container !== null) host(container, window.antumbra, connect(features));
