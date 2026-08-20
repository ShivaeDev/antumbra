import { createRoot } from "react-dom/client";
// why: the App carries no styles of its own — the desktop entry pulls the
// renderer's stylesheet in beside it, and the harness has to do the same or it
// shows the markup bare. This one is safe to load eagerly: it reaches no bridge.
import "@antumbra/renderer/stylesheet.css";

// why: the renderer's bridge builds its tRPC client the moment that module is
// evaluated, so the App is reached through a deferred import — the stub is
// already on the window by the time this graph loads.
export const mount = async (container: HTMLElement): Promise<void> => {
	const { App } = await import("@antumbra/renderer");
	createRoot(container).render(<App />);
};
