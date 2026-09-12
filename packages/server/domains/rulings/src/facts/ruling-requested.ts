import { fact } from "@antumbra/platform-feature/fact.ts";
import { askedInput } from "#commands/inputs.ts";
import { RulingId } from "#ids.ts";
export const rulingRequested = fact("RulingRequested", { id: RulingId, ...askedInput });
