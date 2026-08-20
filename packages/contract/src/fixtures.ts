// why: the fixture sources are the only faithful stand-in for a live host, so
// they ship from the package rather than from its tests — the browser harness
// and the router tests read the same reef from the same module.
export { type FixtureFeeds, staticFeeds } from "#fixtures/feeds.ts";
export { fleet, info } from "#fixtures/fleet.ts";
export { makeRuntime } from "#fixtures/runtime.ts";
export { makeScriptedFeeds, scriptedFeeds } from "#fixtures/scripted.ts";
export { storedEvents } from "#fixtures/transcript.ts";
export { quayView, reefSummary, reefView } from "#fixtures/voyage.ts";
