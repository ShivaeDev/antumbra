import { createRoot } from "react-dom/client";
import { Surface } from "#surface.tsx";

const container = document.getElementById("root");
if (container !== null) {
	createRoot(container).render(<Surface />);
}
