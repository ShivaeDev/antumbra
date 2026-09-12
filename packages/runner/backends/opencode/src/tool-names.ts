export const CALLER_SESSION = "callerSession";
export const CALLER_CALL = "callerCall";
export const CONSTRAINED_AGENT = "antumbra";
export const TOOL_SERVER_NAME = "antumbra";

export const wireName = (name: string): string => `${TOOL_SERVER_NAME}_${name}`;
