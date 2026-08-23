import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "@effect/vitest";
import { MAIN_EXTERNALS } from "#script/adapters/externals.ts";

// why: the mac job packages a real dmg, which is the only thing that proves the
// app runs from its own archive — and the slowest way to learn that a native
// module never made it in. These read the three files that have to agree about
// sharp, and fail in the fast job instead.
const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name: string) => readFileSync(join(desktopRoot, name), "utf8");

const manifest = JSON.parse(read("package.json")) as {
	readonly dependencies: Readonly<Record<string, string>>;
};
const builderConfig = read("electron-builder.yml");
// why: the why-comments in that file name the shapes they exist to rule out,
// so a search for one has to read what the file declares rather than what it
// explains.
const builderDeclarations = builderConfig
	.split("\n")
	.filter((line) => !line.trimStart().startsWith("#"))
	.join("\n");

const listUnder = (key: string): ReadonlyArray<string> => {
	const lines = builderConfig.split("\n");
	const start = lines.indexOf(`${key}:`);
	if (start < 0) {
		return [];
	}
	const entries: Array<string> = [];
	for (const line of lines.slice(start + 1)) {
		if (!line.startsWith("  ")) {
			break;
		}
		const item = /^\s+- (.*)$/.exec(line);
		if (item?.[1] !== undefined) {
			entries.push(item[1].replaceAll('"', ""));
		}
	}
	return entries;
};

const PREBUILD = /^@img\/sharp-(?!libvips-)/;

it("packs every module the main bundle leaves out of itself", () => {
	const packed = Object.keys(manifest.dependencies);
	// why: electron is the host rather than cargo, so it is the one external
	// that must not be packed. Everything else the bundle refuses to inline has
	// to arrive some other way, and a production dependency is that way.
	for (const external of MAIN_EXTERNALS.filter((name) => name !== "electron")) {
		expect(packed).toContain(external);
	}
	expect(packed).not.toContain("electron");
});

it("keeps sharp out of the bundle so it can find its own binary", () => {
	expect(MAIN_EXTERNALS).toContain("sharp");
});

it("unpacks native code from the asar archive", () => {
	const unpacked = listUnder("asarUnpack");
	expect(unpacked).toContain("**/node_modules/sharp/**");
	expect(unpacked).toContain("**/node_modules/@img/**");
});

// why: a workspace install brings down the prebuild for the host and no other,
// so a universal or cross-architecture target would pack an app whose image
// handling has no binary on one of the halves it claims to serve.
it("asks for no architecture the installed prebuilds cannot fill", () => {
	expect(builderDeclarations).not.toContain("universal");
});

// why: sharp resolves its prebuild from its own module directory, so this looks
// for one the same way — the walk an install actually produced, rather than a
// platform name written down here and left to rot.
it("finds a prebuild where sharp itself will look for one", () => {
	const sharpManifestPath = createRequire(import.meta.url).resolve(
		"sharp/package.json",
	);
	const sharpManifest = JSON.parse(readFileSync(sharpManifestPath, "utf8")) as {
		readonly optionalDependencies?: Readonly<Record<string, string>>;
	};
	const fromSharp = createRequire(sharpManifestPath);
	const prebuilds = Object.keys(sharpManifest.optionalDependencies ?? {}).filter(
		(name) => PREBUILD.test(name),
	);
	const installed = prebuilds.filter((name) => {
		try {
			fromSharp.resolve(`${name}/package.json`);
			return true;
		} catch {
			return false;
		}
	});
	expect(prebuilds.length).toBeGreaterThan(0);
	expect(installed.length).toBeGreaterThan(0);
});
