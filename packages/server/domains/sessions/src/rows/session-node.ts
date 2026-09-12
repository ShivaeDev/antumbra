import { row } from "@antumbra/platform-feature/row.ts";
import { Schema } from "effect";
import { SessionId } from "#ids.ts";
export const sessionNode = row(
	"sessionNode",
	{ id: SessionId, rootSessionId: SessionId, nativeRef: Schema.String, spawnedBy: Schema.String, announced: Schema.Boolean },
	{ key: "id", scope: "rootSessionId" },
);
