import { query } from "@antumbra/platform-feature/query.ts";
import { ChangeId } from "@antumbra/platform-vocabulary/changes-ids.ts";
import { Schema } from "effect";
import { change } from "#rows/change.ts";

const Archivable = Schema.Struct({ id: ChangeId, landedAt: Schema.String });

export const archivable = query("archivable", {
	input: {},
	output: Schema.Array(Archivable),
	reads: [change],
});
