import type { Step } from "#ready/model.ts";

export const steps: readonly Step[] = [
	{ args: ["run", "check"], command: "pnpm", name: "formatting" },
	{ args: ["script/lint.ts"], command: "node", name: "lint" },
	{ args: ["run", "lint:boundaries"], command: "pnpm", name: "boundaries" },
	{ args: ["run", "typecheck:workspace"], command: "pnpm", name: "typecheck" },
];
