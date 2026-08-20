import { createRoot } from "react-dom/client";
import "#styles/theme.css";
import { App } from "#app.tsx";

const container = document.getElementById("root");
if (container !== null) {
	createRoot(container).render(<App />);
}
