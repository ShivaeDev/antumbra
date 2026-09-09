import { createRoot } from "react-dom/client";
import "#styles/theme.css";
import { glass } from "#adapters/glass.ts";
import { Surface } from "#surface.tsx";

const container = document.getElementById("root");
if (container !== null) {
	createRoot(container).render(
		<glass.Provider>
			<Surface />
		</glass.Provider>,
	);
}
