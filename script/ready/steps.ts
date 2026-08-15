import type { Step } from "#ready/model.ts";

export const steps: readonly Step[] = [
	{ args: ["run", "check"], command: "pnpm", name: "biome" },
	{ args: ["script/lint.ts"], command: "node", name: "lint" },
	{ args: ["run", "lint:boundaries"], command: "pnpm", name: "boundaries" },
	{ args: ["run", "build"], command: "pnpm", name: "build" },
	{ args: ["run", "typecheck"], command: "pnpm", name: "typecheck" },
	{ args: ["run", "typecheck:root"], command: "pnpm", name: "typecheck root" },
	{
		args: ["run", "typecheck:compat"],
		command: "pnpm",
		name: "typecheck compat",
	},
	{ args: ["run", "test"], command: "pnpm", name: "test" },
	{ args: ["run", "test:guards"], command: "pnpm", name: "guards" },
];
