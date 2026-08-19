import { Changes } from "@antumbra/changes";
import type { Context, Effect } from "effect";

type Requirements = readonly [typeof Changes];

type ChangesRequirements = Context.Service.Identifier<Requirements[number]>;

export type ChangesReturn<Success, Failure = never> = Effect.fn.Return<
	Success,
	Failure,
	ChangesRequirements
>;
