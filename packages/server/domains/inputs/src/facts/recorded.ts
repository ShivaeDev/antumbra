import { fact } from "@antumbra/platform-feature/fact.ts";
import { Prepared } from "#rows/content.ts";
export const inputRecorded = fact("InputRecorded", Prepared.fields);
