import { fact } from "@antumbra/platform-feature/fact.ts";
import { RulingAuthoritySchema } from "@antumbra/platform-vocabulary/ruling.ts";
import { RulingId } from "#ids.ts";
export const rulingSuperseded = fact("RulingSuperseded", { rulingId: RulingId, byRulingId: RulingId, by: RulingAuthoritySchema });
