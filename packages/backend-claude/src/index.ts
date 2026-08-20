// why: the mapping is the half of this backend that runs without a provider
// process. The composition root drives it over a scripted frame script to hold
// the whole acquisition path — tree rows, journals, gaps — to a real stream
// shape at zero model tokens, which is what simulability asks of a backend.
export { openSessionMapping, type SessionMapping } from "#mapping.ts";
export { claudePlugin } from "#plugin.ts";
