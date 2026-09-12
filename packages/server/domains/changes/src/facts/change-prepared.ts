import { fact } from "@antumbra/platform-feature/fact.ts";
import { change } from "#rows/change.ts";
import { pieceChange } from "#rows/piece-change.ts";
export const changePrepared = fact("ChangePrepared", { change: change.Row, link: pieceChange.Row });
