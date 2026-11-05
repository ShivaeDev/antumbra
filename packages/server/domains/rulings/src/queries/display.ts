import { query } from "@antumbra/platform-feature/query.ts";
import { Schema } from "effect";
import { rulingDisplay } from "#rows/display.ts";

const Group = Schema.Struct({ id: Schema.String, name: Schema.String, rulings: Schema.Array(rulingDisplay.Row) });
export const display = query("display", {
	input: {},
	output: Schema.Struct({
		groups: Schema.Array(Group),
		parked: Schema.Array(rulingDisplay.Row),
		openCount: Schema.Number,
		standing: Schema.Array(rulingDisplay.Row),
	}),
	reads: [rulingDisplay],
});
