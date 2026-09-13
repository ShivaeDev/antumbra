import { fact } from "@antumbra/platform-feature/fact.ts";
import { ChangeId } from "#ids.ts";
export const changeArchived = fact("ChangeArchived", { changeId: ChangeId });
