import { observe as sourceObserve } from "@antumbra/domain-capacity/commands/observe.ts";
import { release as sourceRelease } from "@antumbra/domain-capacity/commands/release.ts";
import { providers as sourceProviders } from "@antumbra/domain-capacity/queries/providers.ts";
import { AlreadyDone } from "@antumbra/platform-feature/rejection.ts";
import { collection } from "@shivaedev/changes/keys.ts";
import { contract } from "@shivaedev/contract/contract.ts";
import { command, query } from "@shivaedev/contract/operation.ts";
import { Effect, Schema } from "effect";
export const Observe = command("observe", {
	payload: sourceObserve.Input,
	success: Schema.Number,
	rejections: { ...sourceObserve.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Release = command("release", {
	payload: sourceRelease.Input,
	success: Schema.Number,
	rejections: { ...sourceRelease.Rejection, AlreadyDone },
	invalidates: () => [],
});
export const Providers = query("providers", {
	payload: sourceProviders.input,
	success: sourceProviders.output,
	reads: () => [collection("capacity", Schema.String).list],
	readPolicy: () => Effect.succeed(true),
});
export const CapacityContract = contract("capacity", { commands: [Observe, Release], queries: [Providers] });
