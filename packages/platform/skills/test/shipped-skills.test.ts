import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { expect, it } from "@effect/vitest";
import { skillFolders } from "#index.ts";

const pluginDirectory = dirname(import.meta.dirname);
const folders = skillFolders(pluginDirectory);

const frontmatterName = (skill: string): string | undefined => {
	const text = readFileSync(join(folders, skill, "SKILL.md"), "utf8");
	return /^---\n(?:.*\n)*?name: (?<name>.*)\n/.exec(text)?.groups?.name;
};

it("is a plugin directory holding one folder per skill, each with a SKILL.md that names itself", () => {
	expect(JSON.parse(readFileSync(join(pluginDirectory, ".claude-plugin", "plugin.json"), "utf8"))).toMatchObject({ name: "antumbra" });
	const shipped = readdirSync(folders, { withFileTypes: true }).filter((entry) => entry.isDirectory());
	expect(shipped.length).toBeGreaterThan(0);
	for (const entry of shipped) {
		expect(frontmatterName(entry.name)).toBe(entry.name);
	}
});
