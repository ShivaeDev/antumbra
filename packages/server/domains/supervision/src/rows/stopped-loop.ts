import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";

export const LoopState = Schema.Literals(["stopped", "resumed"]);

export const stoppedLoop = row(
	"stoppedLoop",
	{ loop: Schema.String, at: Schema.Number, message: Schema.String, trace: Schema.String, state: LoopState },
	{ key: "loop" },
);
