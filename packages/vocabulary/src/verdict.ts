import { Schema } from "effect";

// why: a verdict is the admiral's own word about something the fleet cannot
// settle on its own. It is stored as a landed fact and read by the derivations
// like any other — never as an answer written over what they conclude.
export const ChangeVerdict = Schema.Literals(["dismissed"]);
export type ChangeVerdict = typeof ChangeVerdict.Type;

// why: delivered and abandoned are both outcomes, which is why both count as
// landed. They differ in what they mean, so the ladder tells them apart rather
// than hanging a badge on one shared state.
export const PieceVerdict = Schema.Literals(["abandoned", "delivered"]);
export type PieceVerdict = typeof PieceVerdict.Type;
