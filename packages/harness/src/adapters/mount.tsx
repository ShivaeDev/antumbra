import { createRoot } from "react-dom/client";
import "@antumbra/renderer/stylesheet.css";

// Surface reads window.antumbra during module evaluation, so its import stays deferred.
export const mount = async (container: HTMLElement): Promise<void> => {
	const { Surface } = await import("@antumbra/renderer");
	createRoot(container).render(<Surface />);
};
