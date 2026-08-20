import { createRoot } from "react-dom/client";

// why: the renderer's bridge builds its tRPC client the moment that module is
// evaluated, so the surface is reached through a deferred import — the stub is
// already on the window by the time this graph loads.
export const mount = async (container: HTMLElement): Promise<void> => {
	const { Surface } = await import("@antumbra/renderer");
	createRoot(container).render(<Surface />);
};
