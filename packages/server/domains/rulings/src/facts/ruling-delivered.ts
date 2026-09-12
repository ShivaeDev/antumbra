import { fact } from "@antumbra/platform-feature/fact.ts";
import { RulingId } from "#ids.ts";
export const rulingDelivered = fact("RulingDelivered", { rulingId: RulingId });
