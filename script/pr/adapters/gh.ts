import { spawn } from "node:child_process";
import { Effect } from "effect";

export type Response = { readonly body: string | undefined; readonly etag: string | undefined; readonly status: number };

const toError = (cause: unknown): Error => (cause instanceof Error ? cause : new Error(String(cause)));

const statusLine = /^HTTP\/[\d.]+ (\d{3})/;
const etagLine = /^etag:\s*(.+)$/i;

const parse = (stdout: string, stderr: string): Effect.Effect<Response, Error> => {
	const split = stdout.search(/\r?\n\r?\n/);
	const head = split === -1 ? stdout : stdout.slice(0, split);
	const lines = head.split(/\r?\n/);
	const status = lines[0]?.match(statusLine)?.[1];
	if (status === undefined) return Effect.fail(new Error(stderr === "" ? "gh api answered without a status line" : stderr));
	const etag = lines.flatMap((line) => line.match(etagLine)?.[1] ?? []).at(0);
	const code = Number(status);
	if (code === 200) return Effect.succeed({ body: stdout.slice(split).replace(/^\r?\n\r?\n/, ""), etag, status: code });
	if (code === 304) return Effect.succeed({ body: undefined, etag: undefined, status: code });
	return Effect.fail(new Error(`${lines[0]} ${stderr}`.trim()));
};

export const conditionalGet = (path: string, etag: string | undefined): Effect.Effect<Response, Error> =>
	Effect.callback<string[], Error>((resume, signal) => {
		const conditional = etag === undefined ? [] : ["-H", `If-None-Match: ${etag}`];
		const child = spawn("gh", ["api", "-i", ...conditional, path], { stdio: ["ignore", "pipe", "pipe"] });
		const out: Buffer[] = [];
		const err: Buffer[] = [];
		let settled = false;
		const finish = (result: Effect.Effect<string[], Error>): void => {
			if (!settled) {
				settled = true;
				resume(result);
			}
		};
		child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
		child.on("error", (cause) => finish(Effect.fail(toError(cause))));
		child.on("close", () => finish(Effect.succeed([Buffer.concat(out).toString("utf8"), Buffer.concat(err).toString("utf8").trim()])));
		signal.addEventListener("abort", () => child.kill("SIGTERM"));
	}).pipe(Effect.flatMap(([stdout, stderr]) => parse(stdout ?? "", stderr ?? "")));

export const conditional = (): ((path: string) => Effect.Effect<Response, Error>) => {
	const etags = new Map<string, string>();
	return (path) =>
		conditionalGet(path, etags.get(path)).pipe(
			Effect.tap((response) =>
				Effect.sync(() => {
					if (response.etag !== undefined) etags.set(path, response.etag);
				}),
			),
		);
};
