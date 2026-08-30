import type { OpencodeRequest } from "#adapters/connection.ts";

export interface HttpCalls {
	readonly get: (request: OpencodeRequest) => Promise<unknown>;
	readonly post: (request: OpencodeRequest) => Promise<unknown>;
}

const addressOf = (
	baseUrl: string,
	{ path, query }: OpencodeRequest,
): string => {
	const url = new URL(path, baseUrl);
	for (const [key, value] of Object.entries(query)) {
		url.searchParams.set(key, value);
	}
	return url.toString();
};

// why: the server refuses everything without the credentials it was started
// with, so they ride every call including the event stream's own.
export const basicAuth = (password: string): string =>
	`Basic ${Buffer.from(`opencode:${password}`).toString("base64")}`;

const answer = async (response: Response, path: string): Promise<unknown> => {
	const text = await response.text();
	if (!response.ok) {
		throw new Error(
			`${path} answered ${response.status}: ${text.slice(0, 500)}`,
		);
	}
	// why: several of these routes answer 204 with nothing at all, and an empty
	// body is a successful answer rather than a broken one.
	if (text.length === 0) {
		return undefined;
	}
	const answered: unknown = JSON.parse(text);
	return answered;
};

export const httpCalls = (baseUrl: string, password: string): HttpCalls => {
	const headers = {
		authorization: basicAuth(password),
		"content-type": "application/json",
	};
	const call = async (
		request: OpencodeRequest,
		method: "GET" | "POST",
	): Promise<unknown> =>
		answer(
			await fetch(addressOf(baseUrl, request), {
				headers,
				method,
				...(method === "GET" ? {} : { body: JSON.stringify(request.body) }),
			}),
			request.path,
		);
	return {
		get: (request) => call(request, "GET"),
		post: (request) => call(request, "POST"),
	};
};
