import { defineConfig } from "@shivaedev/quality/config.ts";

export default defineConfig({
	exceptions: [
		{
			files: ["packages/glass/components/src/markdown-view.tsx"],
			reason: "The Mermaid adapter produces the trusted SVG rendered by this component.",
			rules: ["biome/lint/security/noDangerouslySetInnerHtml"],
		},
	],
	rules: {
		"boundaries/http-status": {
			options: {
				edge: [
					{
						glob: "packages/server/edges/github/src/client-error.ts",
						reason: "The GitHub edge translates remote HTTP failures into Antumbra's host errors.",
					},
					{
						glob: "script/fixture/adapters/viewer-owner.ts",
						reason: "The fixture HTTP client identifies the viewer through its status endpoint.",
					},
				],
			},
		},
		"files/other-names": {
			options: {
				toolOwned: [
					{
						glob: "packages/runner/backends/codex/src/schema/*.json",
						reason: "The Codex app-server protocol schemas retain their upstream filenames.",
					},
				],
			},
		},
	},
});
