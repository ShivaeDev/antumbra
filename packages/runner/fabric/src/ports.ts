import type { Input } from "@antumbra/platform-runner/input.ts";
import type { ToolAnswer, ToolCall } from "@antumbra/platform-runner/tools.ts";
import type { AgentBackend, SessionInput } from "@antumbra/runner-ports/backend.ts";
import { Context, type Effect } from "effect";

export class BackendRegistry extends Context.Service<BackendRegistry, { readonly backends: ReadonlyMap<string, AgentBackend> }>()(
	"@antumbra/runner-fabric/BackendRegistry",
) {}
export class InputResolver extends Context.Service<InputResolver, { readonly resolve: (input: Input) => Effect.Effect<SessionInput> }>()(
	"@antumbra/runner-fabric/InputResolver",
) {}
export class ServerTools extends Context.Service<ServerTools, { readonly call: (call: ToolCall) => Effect.Effect<ToolAnswer> }>()(
	"@antumbra/runner-fabric/ServerTools",
) {}
export class RunnerIdentity extends Context.Service<RunnerIdentity, { readonly runnerId: string }>()("@antumbra/runner-fabric/RunnerIdentity") {}
