export const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null;

export const blocksOf = (
	payload: unknown,
): ReadonlyArray<Record<string, unknown>> => {
	if (!isRecord(payload) || !isRecord(payload.message)) {
		return [];
	}
	const content = payload.message.content;
	if (typeof content === "string") {
		return [{ text: content, type: "text" }];
	}
	return Array.isArray(content) ? content.filter(isRecord) : [];
};

export const textOf = (content: unknown): string => {
	if (typeof content === "string") {
		return content;
	}
	if (Array.isArray(content)) {
		return content
			.filter(isRecord)
			.map((block) => (typeof block.text === "string" ? block.text : ""))
			.join("");
	}
	return JSON.stringify(content);
};

export const telemetryLabel = (kind: string, payload: unknown): string => {
	if (!isRecord(payload)) {
		return kind;
	}
	const parts = [kind];
	if (typeof payload.model === "string") {
		parts.push(payload.model);
	}
	if (typeof payload.duration_ms === "number") {
		parts.push(`${(payload.duration_ms / 1000).toFixed(1)}s`);
	}
	if (typeof payload.total_cost_usd === "number") {
		parts.push(`$${payload.total_cost_usd.toFixed(4)}`);
	}
	return parts.join(" · ");
};
