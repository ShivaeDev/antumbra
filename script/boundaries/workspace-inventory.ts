import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { Schema } from "effect";
import type { BoundaryPolicyInventory, WorkspacePackageLocation } from "#boundaries/model.ts";
import { failPolicy } from "#boundaries/validation.ts";

const VocabularyManifest = Schema.Struct({
	exports: Schema.Record(Schema.String, Schema.String),
});
const PackageManifest = Schema.Struct({
	name: Schema.String,
});

const packageRoots = (directory: string): readonly string[] =>
	existsSync(join(directory, "package.json"))
		? [directory]
		: readdirSync(directory, { withFileTypes: true })
				.filter((entry) => entry.isDirectory() && entry.name !== "node_modules")
				.flatMap((entry) => packageRoots(join(directory, entry.name)));

const manifestAt = (absolute: string) => Schema.decodeUnknownSync(PackageManifest)(JSON.parse(readFileSync(join(absolute, "package.json"), "utf8")));

const locations = (root: string, area: "apps" | "packages"): readonly WorkspacePackageLocation[] =>
	packageRoots(join(root, area)).map((absolute) => ({
		name: manifestAt(absolute).name.replace(/^@antumbra\//, ""),
		path: relative(root, absolute).split(sep).join("/"),
	}));

export const collectBoundaryPolicyInventory = (root: string): BoundaryPolicyInventory => {
	const packages = locations(root, "packages");
	const vocabulary = packages.find(({ name }) => name === "vocabulary")?.path ?? failPolicy("Boundary policy inventory found no vocabulary package");
	const manifest = Schema.decodeUnknownSync(VocabularyManifest)(JSON.parse(readFileSync(join(root, vocabulary, "package.json"), "utf8")));
	return {
		applications: locations(root, "apps").map(({ name }) => name),
		packages,
		vocabularySubjects: Object.keys(manifest.exports)
			.filter((specifier) => specifier.startsWith("./"))
			.map((specifier) => specifier.slice(2)),
	};
};
