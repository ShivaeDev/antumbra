import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	test: {
		projects: [
			{ root, test: { name: "app-testing/app", include: ["test/**/*.test.ts"] } },
			{
				root,
				extends: fileURLToPath(new URL("./src/glass/config.ts", import.meta.url)),
				test: { name: "app-testing/glass", include: ["test/**/*.test.tsx"] },
			},
		],
	},
});
