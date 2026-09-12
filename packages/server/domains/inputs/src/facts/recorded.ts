import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { Prepared } from "#rows/content.ts";
export const inputRecorded = fact("InputRecorded", { ...Prepared.fields, deliveryKind: Schema.Literals(["wake", "steer"]) });
