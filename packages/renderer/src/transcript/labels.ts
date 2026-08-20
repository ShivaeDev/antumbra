import type {
	SessionOpened,
	SubsessionEnded,
	SubsessionGap,
	SubsessionOpened,
	TurnCompleted,
	UsageEvent,
} from "@antumbra/vocabulary/session-events";

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export const usageLabel = (event: typeof UsageEvent.Type): string =>
	[
		"usage",
		...(event.model === undefined ? [] : [event.model]),
		`${event.inputTokens}→${event.outputTokens} tokens`,
		...(event.costUsd === undefined ? [] : [`$${event.costUsd.toFixed(4)}`]),
	].join(" · ");

export const turnLabel = (event: typeof TurnCompleted.Type): string =>
	[
		`turn ${event.status}`,
		...(event.durationMs === undefined ? [] : [seconds(event.durationMs)]),
	].join(" · ");

export const openedLabel = (event: typeof SessionOpened.Type): string =>
	`session opened · ${event.raw.source} ${event.nativeRef}`;

const said = (value: string | undefined): readonly string[] =>
	value === undefined || value === "" ? [] : [value];

export const subsessionOpenedLabel = (
	event: typeof SubsessionOpened.Type,
): string =>
	["subsession opened", ...said(event.kind), ...said(event.label)].join(" · ");

export const subsessionEndedLabel = (
	event: typeof SubsessionEnded.Type,
): string =>
	[
		`subsession ${event.outcome}`,
		...(event.tokens === undefined ? [] : [`${event.tokens} tokens`]),
		...(event.durationMs === undefined ? [] : [seconds(event.durationMs)]),
	].join(" · ");

export const subsessionGapLabel = (event: typeof SubsessionGap.Type): string =>
	[`subsession gap · ${event.gapKind}`, ...said(event.detail)].join(" · ");
