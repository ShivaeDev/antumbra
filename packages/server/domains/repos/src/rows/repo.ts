import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { RepoId } from "#ids.ts";

export const repo = row(
	"repo",
	{
		id: RepoId,
		name: Schema.String,
		source: Schema.String,
		defaultRef: Schema.String,
		createdAt: Schema.String,
	},
	{ key: "id" },
);
