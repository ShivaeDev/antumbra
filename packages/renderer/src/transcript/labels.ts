import type {
	RawPayload,
	SessionBackgroundEvent,
	SessionOpened,
	SessionState,
	SessionStateEvent,
	TurnCompleted,
} from "@antumbra/vocabulary/session-events.ts";

const seconds = (ms: number): string => `${(ms / 1000).toFixed(1)}s`;

export const stateWords: Record<SessionState, string> = {
	"awaiting-input": "awaiting input",
	idle: "idle",
	running: "running",
};

export const stateLabel = (event: typeof SessionStateEvent.Type): string => `state · ${stateWords[event.state]}`;

const DESCRIPTION = 60;

const taskWords = (task: (typeof SessionBackgroundEvent.Type)["tasks"][number]): string => {
	const said = task.description.trim();
	const short = said.length > DESCRIPTION ? `${said.slice(0, DESCRIPTION - 1)}…` : said;
	return short === "" ? task.kind : `${task.kind} ${short}`;
};

export const backgroundLabel = (event: typeof SessionBackgroundEvent.Type): string =>
	event.tasks.length === 0 ? "background · nothing running" : `background · ${event.tasks.length} · ${event.tasks.map(taskWords).join(", ")}`;

export const turnLabel = (event: typeof TurnCompleted.Type): string =>
	[`turn ${event.status}`, ...(event.durationMs === undefined ? [] : [seconds(event.durationMs)])].join(" · ");

export const openedLabel = (event: typeof SessionOpened.Type): string => `session opened · ${event.raw.source} ${event.nativeRef}`;

const words = (kind: string): string =>
	kind
		.split(/[/_]/)
		.flatMap((part) => part.split(/(?=[A-Z])/))
		.join(" ")
		.toLowerCase();

export const rawLabel = (raw: RawPayload): string => `${raw.source}: ${words(raw.kind)}`;
