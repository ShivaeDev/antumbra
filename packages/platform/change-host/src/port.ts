import { Context, Data, type Effect } from "effect";
import type { Capability, ChangeRef, HostRepo, Observation, OpenRequest } from "#schema.ts";
export class ChangeHostUnavailable extends Data.TaggedError("ChangeHostUnavailable")<{ readonly host: string; readonly detail: string }> {
	override get message(): string {
		return this.detail;
	}
}
export class ChangeHostRefused extends Data.TaggedError("ChangeHostRefused")<{ readonly host: string; readonly detail: string }> {
	override get message(): string {
		return this.detail;
	}
}
export type ChangeHostError = ChangeHostUnavailable | ChangeHostRefused;
export interface ChangeHost {
	readonly tag: string;
	readonly supports: (repo: HostRepo) => boolean;
	readonly capability: Effect.Effect<Capability, ChangeHostError>;
	readonly open: (request: OpenRequest) => Effect.Effect<Observation, ChangeHostError>;
	readonly adopt: (url: string, repo: HostRepo) => Effect.Effect<Observation, ChangeHostError>;
	readonly observe: (refs: ReadonlyArray<ChangeRef>) => Effect.Effect<ReadonlyArray<Observation>, ChangeHostError>;
}
export class ChangeHosts extends Context.Service<ChangeHosts, ReadonlyArray<ChangeHost>>()("@antumbra/platform-change-host/ChangeHosts") {}
