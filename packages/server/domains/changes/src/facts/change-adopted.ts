import { fact } from "@antumbra/platform-feature/fact.ts";
import { Schema } from "effect";
import { change } from "#rows/change.ts";
import { changeTransition } from "#rows/change-transition.ts";
import { pieceChange } from "#rows/piece-change.ts";
export const changeAdopted = fact("ChangeAdopted", { change: change.Row, transition: Schema.NullOr(changeTransition.Row), link: pieceChange.Row });
