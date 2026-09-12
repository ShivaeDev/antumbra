import { connect } from "@antumbra/glass-client/connect.ts";
import { mount } from "@antumbra/glass-renderer/mount.tsx";
import { features } from "@antumbra/server/features.ts";
import { Effect } from "effect";
import { browserBridge, needsTheLink } from "#browser/bridge.ts";
import "@antumbra/glass-components/styles/theme.css";

const container = document.getElementById("root");
if (container !== null) {
	const bridge = window.antumbra ?? browserBridge(location);
	if (bridge === undefined) {
		container.textContent = needsTheLink;
	} else {
		Effect.runFork(Effect.scoped(mount(container, bridge, connect(features))));
	}
}
