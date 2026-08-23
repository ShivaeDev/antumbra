import { readdirSync, readFileSync, realpathSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, it } from "@effect/vitest";
import { Schema } from "effect";
import { MAIN_EXTERNALS } from "#script/adapters/externals.ts";

// why: the mac job packages a real dmg, which is the only thing that proves the
// app runs from its own archive — and the slowest way to learn that a native
// module never made it in. These read the three files that have to agree about
// sharp, and fail in the fast job instead.
const desktopRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const read = (name: string) => readFileSync(join(desktopRoot, name), "utf8");

const Packed = Schema.Struct({
	dependencies: Schema.Record(Schema.String, Schema.String),
});
const Prebuilt = Schema.Struct({
	optionalDependencies: Schema.Record(Schema.String, Schema.String),
});

const packedManifest: unknown = JSON.parse(read("package.json"));
const packed = Object.keys(
	Schema.decodeUnknownSync(Packed)(packedManifest).dependencies,
);

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

// why: sharp loads its binary from a scoped package sitting beside it in the
// same node_modules — the shape the unpack glob above names. Reading that
// directory reads the layout an install actually produced, rather than a
// platform name written down here and left to rot.
it("installs a prebuild beside sharp for the host it packs for", () => {
	const sharpRoot = realpathSync(join(desktopRoot, "node_modules", "sharp"));
	const declared: unknown = JSON.parse(
		readFileSync(join(sharpRoot, "package.json"), "utf8"),
	);
	const prebuilds = Object.keys(
		Schema.decodeUnknownSync(Prebuilt)(declared).optionalDependencies,
	).filter((name) => PREBUILD.test(name));
	const beside = readdirSync(join(dirname(sharpRoot), "@img")).map(
		(name) => `@img/${name}`,
	);
	expect(prebuilds.length).toBeGreaterThan(0);
	expect(prebuilds.filter((name) => beside.includes(name))).not.toHaveLength(0);
});
