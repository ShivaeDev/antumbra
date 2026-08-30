import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Schema } from "effect";
import type { BoundaryPolicyInventory } from "#boundaries/model.ts";

const VocabularyManifest = Schema.Struct({
	exports: Schema.Record(Schema.String, Schema.String),
});

const directories = (root: string, area: "apps" | "packages") =>
	readdirSync(join(root, area), { withFileTypes: true })
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);

export const collectBoundaryPolicyInventory = (root: string): BoundaryPolicyInventory => {
	const vocabulary = Schema.decodeUnknownSync(VocabularyManifest)(JSON.parse(readFileSync(join(root, "packages/vocabulary/package.json"), "utf8")));
	return {
		applications: directories(root, "apps"),
		packages: directories(root, "packages"),
		vocabularySubjects: Object.keys(vocabulary.exports)
			.filter((specifier) => specifier.startsWith("./"))
			.map((specifier) => specifier.slice(2)),
	};
};
