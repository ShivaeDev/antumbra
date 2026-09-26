import { spawn } from "node:child_process";
import { Effect } from "effect";
import type { Response } from "#pr/pages.ts";

type Ran = { readonly code: number | null; readonly stderr: string; readonly stdout: string };

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
	if (code === 200) return Effect.succeed({ body: stdout.slice(split).replace(/^\r?\n\r?\n/, ""), etag });
	if (code === 304) return Effect.succeed({ body: undefined, etag: undefined });
	return Effect.fail(new Error(`${lines[0]} ${stderr}`.trim()));
};

const gh = (args: readonly string[]): Effect.Effect<Ran, Error> =>
	Effect.callback<Ran, Error>((resume, signal) => {
		const child = spawn("gh", args, { stdio: ["ignore", "pipe", "pipe"] });
		const out: Buffer[] = [];
		const err: Buffer[] = [];
		let settled = false;
		const finish = (result: Effect.Effect<Ran, Error>): void => {
			if (!settled) {
				settled = true;
				resume(result);
			}
		};
		child.stdout.on("data", (chunk: Buffer) => out.push(chunk));
		child.stderr.on("data", (chunk: Buffer) => err.push(chunk));
		child.on("error", (cause) => finish(Effect.fail(toError(cause))));
		child.on("close", (code) =>
			finish(Effect.succeed({ code, stderr: Buffer.concat(err).toString("utf8").trim(), stdout: Buffer.concat(out).toString("utf8") })),
		);
		signal.addEventListener("abort", () => child.kill("SIGTERM"));
	});

export const conditionalGet = (path: string, etag: string | undefined): Effect.Effect<Response, Error> =>
	gh(["api", "-i", ...(etag === undefined ? [] : ["-H", `If-None-Match: ${etag}`]), path]).pipe(
		Effect.flatMap((ran) => parse(ran.stdout, ran.stderr)),
	);

export const currentRepo: Effect.Effect<string, Error> = gh(["api", "repos/{owner}/{repo}", "--jq", ".full_name"]).pipe(
	Effect.flatMap((ran) => {
		const repo = ran.stdout.trim();
		if (ran.code === 0 && repo !== "") return Effect.succeed(repo);
		return Effect.fail(new Error(ran.stderr === "" ? "gh found no GitHub repository for the current directory" : ran.stderr));
	}),
);
