import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeId } from "#ids.ts";
export const changeDismissed = fact("ChangeDismissed", { changeId: ChangeId });
