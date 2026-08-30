import type { SessionPresence } from "@antumbra/vocabulary/agent-runtime";

// why: what "genuinely at rest" means, said once. Three readers ask it — the
// projection that decides whether the admiral is offered the act, the guard
// inside the act itself, and the clock that performs the same act unasked —
// and a rule with three homes is a rule that will eventually disagree with
// itself about whether a tree may be taken apart.
//
// why: delegation is asked of the acquisition, never of the rows. A node row
// stays open until something ends it, and a provider that never says a child
// finished leaves one open for the life of the record; reading rows here would
// mean a Session that once delegated could never rest again.
export const sessionAtRest = (input: { readonly delegating: boolean; readonly presence: SessionPresence }): boolean =>
	input.presence === "idle" && !input.delegating;

// why: retirement is the deliberate end of an identity and the only thing that
// closes a subtree the record has stopped hearing from, so it answers to a
// weaker rule than rest does. Hiding it behind the whole tree settling would
// make a stuck tree the one state with no way out — but ending an Agent
// mid-turn is still severing work it is doing, so it stays hidden while the
// Session is working and is offered in every other presence.
export const sessionRetirable = (presence: SessionPresence): boolean => presence !== "working";
