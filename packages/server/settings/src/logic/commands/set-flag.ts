import type * as Source from "@antumbra/domain-settings/commands/set-flag.ts";
import { Effect } from "effect";

export const setFlag = (input: typeof Source.setFlag.Input.Type) => Effect.succeed({ keys: [input.key], on: input.on });
