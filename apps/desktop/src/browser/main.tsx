import { connect } from "@antumbra/glass-client/connect.ts";
import { mount } from "@antumbra/glass-renderer/mount.tsx";
import { features } from "@antumbra/server/features.ts";
import { Effect, Fiber } from "effect";
import { fixtureBridge } from "#adapters/browser-fixture.ts";
import { browserBridge, needsTheLink } from "#browser/bridge.ts";
import "@antumbra/glass-components/styles/theme.css";
import "#browser/fixture.css";

const container = document.getElementById("root");
if (container !== null) {
	const bridge = window.antumbra ?? browserBridge(location);
	if (bridge === undefined) {
		container.textContent = needsTheLink;
	} else {
		const shell = new URLSearchParams(location.search).has("fixture")
			? Effect.acquireRelease(
					Effect.promise(() => fixtureBridge(bridge)),
					(fixture) => Effect.sync(fixture.dispose),
				).pipe(Effect.map((fixture) => fixture.bridge))
			: Effect.succeed(bridge);
		const rendering = Effect.runFork(Effect.scoped(shell.pipe(Effect.flatMap((value) => mount(container, value, connect(features))))));
		const dispose = () => {
			Effect.runFork(Fiber.interrupt(rendering));
		};
		window.addEventListener("pagehide", dispose, { once: true });
		import.meta.hot?.dispose(() => {
			window.removeEventListener("pagehide", dispose);
			dispose();
		});
	}
}
