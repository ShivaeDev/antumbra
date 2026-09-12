import * as Id from "#id.ts";

export const requestId = (context: { readonly sessionId: string; readonly callId: string }, step = ""): Id.Request =>
	Id.Request.make(JSON.stringify([context.sessionId, context.callId, step]));
