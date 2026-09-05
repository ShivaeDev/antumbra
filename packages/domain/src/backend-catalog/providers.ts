import type { AgentBackend } from "@antumbra/plugin-api";
import { Context } from "effect";

export class BackendProviders extends Context.Service<BackendProviders, ReadonlyMap<string, AgentBackend>>()("@antumbra/domain/BackendProviders") {}
