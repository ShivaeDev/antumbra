import type { providerEvent } from "@antumbra/domain-sessions/facts/provider-event.ts";
import { SessionId } from "@antumbra/domain-sessions/ids.ts";
import type { FactPayload } from "@antumbra/platform-feature/fact.ts";
import type { LogEntry } from "@antumbra/platform-runner/log.ts";

export const providerEventObservation = (entry: LogEntry): FactPayload<typeof providerEvent> | null => {
	const event = entry.event;
	if (event.type !== "ProviderEvent") return null;
	const provider = event.event;
	const usage =
		provider.type === "usage"
			? {
					inputTokens: provider.inputTokens,
					outputTokens: provider.outputTokens,
					...(provider.model === undefined ? {} : { model: provider.model }),
					...(provider.costUsd === undefined ? {} : { costUsd: provider.costUsd }),
					...(provider.cumulativeCostUsd === undefined ? {} : { cumulativeCostUsd: provider.cumulativeCostUsd }),
					...(provider.cacheReadTokens === undefined ? {} : { cacheReadTokens: provider.cacheReadTokens }),
					...(provider.cacheWriteTokens === undefined ? {} : { cacheWriteTokens: provider.cacheWriteTokens }),
				}
			: null;
	return {
		sessionId: SessionId.make(event.sessionId),
		logId: entry.logId,
		cursor: entry.cursor,
		observedAt: entry.at,
		origin: "origin" in provider ? (provider.origin ?? null) : null,
		usage,
	};
};
