import { command } from "@antumbra/platform-feature/command.ts";
import { titled } from "@antumbra/platform-feature/edit.ts";
import { Schema } from "effect";
import { repoRegistered } from "#facts/repo-registered.ts";
import { repo } from "#rows/repo.ts";

export const register = command("register", {
	input: {
		source: titled(Schema.String, { title: "Source" }),
		defaultRef: titled(Schema.String, { title: "Default ref" }),
	},
	reads: [repo],
	emits: repoRegistered,
	rejections: {
		SlugTaken: { field: Schema.String, message: Schema.String, registeredSource: Schema.String, slug: Schema.String, source: Schema.String },
	},
});
