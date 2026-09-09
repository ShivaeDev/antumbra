import type { AgentBackendTag } from "@antumbra/vocabulary/agent-backend.ts";
import * as Id from "@antumbra/vocabulary/id.ts";

export const BackendModelId = Id.brand("BackendModelId");
export type BackendModelId = typeof BackendModelId.Type;

export const backendModelId = (backend: AgentBackendTag, model: string): BackendModelId => BackendModelId.make(`${backend}/${model}`);
