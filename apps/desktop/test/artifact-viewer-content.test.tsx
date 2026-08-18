import { Buffer } from "node:buffer";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { encodeArtifactPresentation } from "#adapters/artifact-viewer-window.ts";
import { ArtifactDocument } from "#viewer/markdown-render.tsx";
import type { ArtifactViewerInput } from "#viewer/model.ts";

const digest = "a".repeat(64);
const input = (markdown: string): ArtifactViewerInput => ({
	artifactId: "artifact-1",
	byteSize: new TextEncoder().encode(markdown).byteLength,
	digest,
	markdown,
	title: "Survey <script>",
});

it("renders ordinary Markdown in the Artifact window", () => {
	const output = renderToStaticMarkup(
		<ArtifactDocument
			input={input(
				"# Reef\n# Reef\n[first](#reef) [second](#reef-2) [unsafe](#Reef)\n<script>alert(1)</script>\n![remote](https://bad.invalid/x)\n[secure](https://example.com/a) [plain](http://example.com)",
			)}
		/>,
	);

	expect(output).not.toContain("alert(1)");
	expect(output).toContain('src="https://bad.invalid/x"');
	expect(output).toContain('href="https://example.com/a"');
	expect(output).toContain('href="http://example.com"');
	expect(output).toContain('href="#reef"');
});

it("shows Mermaid source while the direct renderer starts", () => {
	const output = renderToStaticMarkup(
		<ArtifactDocument input={input("```mermaid\ngraph TD\n A-->B\n```")} />,
	);
	expect(output).toContain("graph TD");
	expect(output).not.toContain("iframe");
});

it("passes ordinary Mermaid source to the renderer", () => {
	const output = renderToStaticMarkup(
		<ArtifactDocument
			input={input("```mermaid\ngraph TD\nclick A https://example.com\n```")}
		/>,
	);
	expect(output).toContain("graph TD");
	expect(output).not.toContain("Diagram unavailable");
});

it("round-trips arbitrary verified UTF-8 through window presentation", () => {
	const original = input('quotes " slashes \\ tags </script> separators   🌊');
	const decoded: unknown = JSON.parse(
		Buffer.from(encodeArtifactPresentation(original), "base64").toString(
			"utf8",
		),
	);
	expect(decoded).toEqual(original);
});
