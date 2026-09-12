import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";

export const Evidence = Schema.Union([
	Schema.Struct({
		type: Schema.Literal("started"),
		agentId: Schema.String,
		backend: Schema.String,
		cwd: Schema.String,
		nativeRef: Schema.String,
		runnerId: Schema.String,
		toolSetVersion: Schema.String,
	}),
	Schema.Struct({ type: Schema.Literal("woke"), runnerId: Schema.String }),
	Schema.Struct({ type: Schema.Literals(["slept", "ended", "failed"]), reason: Schema.String }),
	Schema.Struct({ type: Schema.Literal("native"), nativeRef: Schema.String }),
	Schema.Struct({ type: Schema.Literal("activity"), state: Schema.Literals(["active", "idle"]) }),
	Schema.Struct({ type: Schema.Literal("background"), count: Schema.Number }),
	Schema.Struct({
		type: Schema.Literal("opened"),
		nativeRef: Schema.String,
		parentRef: Schema.NullOr(Schema.String),
		label: Schema.NullOr(Schema.String),
		kind: Schema.NullOr(Schema.String),
	}),
	Schema.Struct({ type: Schema.Literal("closed"), nativeRef: Schema.String, outcome: Schema.String }),
	Schema.Struct({ type: Schema.Literal("gap"), detail: Schema.String }),
	Schema.Struct({ type: Schema.Literal("tool-called"), callId: Schema.String, name: Schema.String, input: Schema.String }),
	Schema.Struct({ type: Schema.Literal("tool-answered"), callId: Schema.String }),
	Schema.Struct({ type: Schema.Literal("input-accepted"), inputId: Schema.String }),
]);
export const observed = fact("SessionObserved", {
	sessionId: SessionId,
	nodeRef: Schema.NullOr(Schema.String),
	operationId: Schema.NullOr(Schema.String),
	evidence: Evidence,
});
