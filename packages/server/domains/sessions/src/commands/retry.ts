import { command } from "@antumbra/platform-feature/command.ts";
import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { SessionOperationId } from "#ids.ts";
import { session } from "#rows/session.ts";
import { sessionOperation } from "#rows/session-operation.ts";

export const operationRetried = fact("SessionOperationRetried", { previousId: SessionOperationId, operation: sessionOperation.Row });

export const retry = command("retry", {
	input: { id: SessionOperationId },
	reads: [sessionOperation, session],
	emits: operationRetried,
	rejections: { Unavailable: { message: Schema.String } },
});
