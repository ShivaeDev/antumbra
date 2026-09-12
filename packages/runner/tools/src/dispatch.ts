import type { ToolCall } from "@antumbra/platform-runner/tools.ts";
import type { ToolAnswer } from "@antumbra/platform-vocabulary/tool-answer.ts";
import { Context, type Effect } from "effect";

export class ToolDispatch extends Context.Service<ToolDispatch, { readonly call: (call: ToolCall) => Effect.Effect<ToolAnswer> }>()(
	"@antumbra/runner-tools/ToolDispatch",
) {}
