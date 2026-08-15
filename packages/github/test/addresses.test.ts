import { describe, expect, it } from "@effect/vitest";
import { Option } from "effect";
import { parsePullUrl } from "#pull-url.ts";
import { parseGitHubSource, sameRepo } from "#source.ts";

const claimed: ReadonlyArray<readonly [string, string, string]> = [
	["https://github.com/ShivaeDev/antumbra", "ShivaeDev", "antumbra"],
	["https://github.com/ShivaeDev/antumbra.git", "ShivaeDev", "antumbra"],
	["https://github.com/ShivaeDev/antumbra/", "ShivaeDev", "antumbra"],
	["http://github.com/o/n", "o", "n"],
	["git@github.com:ShivaeDev/antumbra.git", "ShivaeDev", "antumbra"],
	["git@github.com:ShivaeDev/antumbra", "ShivaeDev", "antumbra"],
	["ssh://git@github.com/ShivaeDev/antumbra.git", "ShivaeDev", "antumbra"],
	["github.com/ShivaeDev/antumbra", "ShivaeDev", "antumbra"],
	["  github.com/o/n.github  ", "o", "n.github"],
];

const disowned: ReadonlyArray<string> = [
	"/somewhere/reef",
	"~/repos/antumbra",
	"https://gitlab.com/o/n",
	"https://notgithub.com/o/n",
	"https://github.company.com/o/n",
	"https://github.com/onlyowner",
	"https://github.com/o/n/pull/23",
	'https://github.com/o/n"){malice}#',
];

describe("which repos this host claims", () => {
	it.each(claimed)("claims %s", (source, owner, name) => {
		expect(parseGitHubSource(source)).toEqual(Option.some({ name, owner }));
	});

	it.each(disowned)("leaves %s to another host", (source) => {
		expect(Option.isNone(parseGitHubSource(source))).toBe(true);
	});

	it("compares owner and name without minding case", () => {
		expect(
			sameRepo(
				{ name: "Antumbra", owner: "ShivaeDev" },
				{ name: "antumbra", owner: "shivaedev" },
			),
		).toBe(true);
		expect(
			sameRepo(
				{ name: "antumbra", owner: "ShivaeDev" },
				{ name: "antumbra", owner: "someone-else" },
			),
		).toBe(false);
	});
});

describe("which addresses a change can be adopted by", () => {
	it("reads owner, name and number off a pull request url", () => {
		expect(
			parsePullUrl("https://github.com/ShivaeDev/antumbra/pull/23"),
		).toEqual(
			Option.some({ name: "antumbra", number: 23, owner: "ShivaeDev" }),
		);
		expect(
			parsePullUrl("https://github.com/ShivaeDev/antumbra/pull/23/files"),
		).toEqual(
			Option.some({ name: "antumbra", number: 23, owner: "ShivaeDev" }),
		);
		expect(
			parsePullUrl("https://github.com/ShivaeDev/antumbra/pull/23?w=1"),
		).toEqual(
			Option.some({ name: "antumbra", number: 23, owner: "ShivaeDev" }),
		);
	});

	it.each([
		"https://github.com/ShivaeDev/antumbra",
		"https://github.com/ShivaeDev/antumbra/issues/23",
		"https://github.com/ShivaeDev/antumbra/pull/",
		"https://gitlab.com/o/n/pull/23",
		"antumbra#23",
	])("refuses %s", (url) => {
		expect(Option.isNone(parsePullUrl(url))).toBe(true);
	});
});
