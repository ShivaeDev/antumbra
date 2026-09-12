export const SESSION = "ses_fake0000000000000000000";

export const frame = (type: string, properties: unknown) => ({
	payload: { properties, type },
});

export const sessionFrame = (type: string, properties: object) => frame(type, { sessionID: SESSION, ...properties });

export const status = (type: "busy" | "idle" | "retry") => sessionFrame("session.status", { status: { type } });

export const idled = () => sessionFrame("session.idle", {});

export const aborted = () => sessionFrame("session.error", { error: { name: "MessageAbortedError" } });

export const spoke = (id: string, role: "assistant" | "user", model?: { modelID: string; providerID: string }) =>
	sessionFrame("message.updated", { info: { id, role, ...model } });

export const part = (value: object) => sessionFrame("message.part.updated", { part: value });

export const textPart = (messageID: string, text: string, ended: boolean): object => ({
	id: `prt_${messageID}_text`,
	messageID,
	text,
	...(ended ? { time: { end: 2, start: 1 } } : {}),
	type: "text",
});

export const toolPart = (messageID: string, state: object): object => ({
	callID: "call_1",
	id: `prt_${messageID}_tool`,
	messageID,
	state,
	tool: "bash",
	type: "tool",
});

export const stepFinish = (messageID: string): object => ({
	cost: 0.25,
	id: `prt_${messageID}_finish`,
	messageID,
	tokens: { cache: { read: 7, write: 3 }, input: 11, output: 5 },
	type: "step-finish",
});
