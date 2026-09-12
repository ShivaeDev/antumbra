import type { sessionToolCall } from "@antumbra/domain-sessions/rows/session-tool-call.ts";
import { requestId } from "@antumbra/platform-vocabulary/tool-request.ts";
import { Option, Schema } from "effect";
import type { Ruling } from "#rows/ruling.ts";

const Details = Schema.fromJsonString(Schema.Struct({ urgency: Schema.optional(Schema.String), rulingId: Schema.optional(Schema.String) }));
const details = Schema.decodeUnknownOption(Details);
export const heldBy = (ruling: Ruling, call: typeof sessionToolCall.Row.Type): boolean => {
	if (call.answer !== null || call.answeredAt !== null) return false;
	const input = details(call.input);
	if (Option.isNone(input)) return false;
	if (call.name === "request_ruling") return input.value.urgency === "blocking" && String(requestId(call)) === ruling.id;
	return call.name === "add_context" && input.value.rulingId === ruling.id;
};
