// why: who is calling is decided when the tools are built, at spawn, so a
// handler never has to trust anything the model says about itself. Dispatched
// crew answer to a piece within an exact Voyage, captains answer directly to a
// Voyage, and a hand-spawned agent may answer to neither.
export type { SessionIdentity } from "@antumbra/sessions";
