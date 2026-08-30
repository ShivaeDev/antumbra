// why: the projection is the half of this backend that runs without a provider
// process. The composition root drives it over a scripted frame script — the
// events opencode broadcasts for a session — so the whole acquisition path is
// held to a real provider shape at zero model tokens, which is what
// simulability asks of a backend.
export { opencodePlugin } from "#plugin.ts";
export { openSessionProjection, type SessionProjection } from "#projection.ts";
export { frameFor, type SessionFrame } from "#session-frames.ts";
