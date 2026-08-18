import { createRoot } from "react-dom/client";
import { ArtifactDocument } from "#viewer/markdown-render.tsx";
import type { ArtifactViewerInput } from "#viewer/model.ts";

declare global {
	interface Window {
		presentArtifact: (input: ArtifactViewerInput) => void;
	}
}

const element = document.getElementById("root");
const root = element === null ? undefined : createRoot(element);

window.presentArtifact = (input) => {
	if (root === undefined) {
		document.body.textContent = "Artifact viewer unavailable";
		return;
	}
	document.title = input.title;
	root.render(<ArtifactDocument input={input} />);
};
