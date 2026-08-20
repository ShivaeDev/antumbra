import { createRoot } from "react-dom/client";
import "#styles/theme.css";
import { Surface } from "#surface.tsx";

const container = document.getElementById("root");
if (container !== null) {
	createRoot(container).render(<Surface />);
}
