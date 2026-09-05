import { Option } from "effect";
import type { Ruling, RulingContext } from "#model.ts";

export const admiralAsks = (ruling: Ruling): ReadonlyArray<RulingContext> =>
	ruling.contexts.filter((context) => Option.isNone(context.authorAgentId));
