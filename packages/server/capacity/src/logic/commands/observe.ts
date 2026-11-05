import type * as Source from "@antumbra/domain-capacity/commands/observe.ts";
import { Effect } from "effect";

export const observe = (input: typeof Source.observe.Input.Type) => Effect.succeed(input);
