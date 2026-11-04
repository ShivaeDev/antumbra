import type { LogEntry, LogEvent } from "@antumbra/platform-runner/log.ts";
import type { AgentEvent } from "@antumbra/platform-vocabulary/session-events/events.ts";
export const entry = (logId: string, cursor: number, event: LogEvent, at = cursor): LogEntry => ({ logId, cursor, event, at });
export const started = (logId: string, cursor: number, sessionId: string, agentId = sessionId): LogEntry =>
	entry(logId, cursor, {
		type: "SessionStarted",
		sessionId,
		agentId,
		requestId: `start:${sessionId}`,
		backend: "claude",
		cwd: "/berth",
		nativeRef: `native:${sessionId}`,
		runnerId: "runner",
		toolSetVersion: "v1",
	});
export const provider = (logId: string, cursor: number, sessionId: string, event: AgentEvent): LogEntry =>
	entry(logId, cursor, { type: "ProviderEvent", sessionId, observation: "live", event });
export const raw = { source: "scripted", kind: "provider", payload: "{}" };
