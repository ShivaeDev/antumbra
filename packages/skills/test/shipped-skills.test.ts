import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, it } from "@effect/vitest";
import { skillFolders } from "#index.ts";

const packageRoot = dirname(import.meta.dirname);
const folders = skillFolders(packageRoot);

const frontmatterName = (skill: string): string | undefined => {
	const text = readFileSync(join(folders, skill, "SKILL.md"), "utf8");
	return /^---\n(?:.*\n)*?name: (?<name>.*)\n/.exec(text)?.groups?.name;
};

it("ships one folder per skill, each holding a SKILL.md that names itself", () => {
	const shipped = readdirSync(folders, { withFileTypes: true }).filter((entry) => entry.isDirectory());
	expect(shipped.length).toBeGreaterThan(0);
	for (const entry of shipped) {
		expect(frontmatterName(entry.name)).toBe(entry.name);
	}
});

it("carries the manifest Claude Code reads to load the folder as a plugin", () => {
	expect(JSON.parse(readFileSync(join(packageRoot, ".claude-plugin", "plugin.json"), "utf8"))).toMatchObject({ name: "antumbra" });
});
