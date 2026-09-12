import { Effect, Layer } from "effect";
import { GhProcess } from "#process.ts";

export interface ScriptedAnswer {
	readonly out?: string;
	readonly err?: string;
	readonly code?: number;
}
export const AUTHENTICATED = { out: "Logged in to github.com account skipper (keyring)" };
export const LOGGED_OUT = { code: 4, err: "Run gh auth login" };
export const scriptedGh = Effect.sync(() => {
	const answers = new Map<string, ScriptedAnswer>();
	const received: string[] = [];
	const layer = Layer.succeed(GhProcess, {
		run: (command) =>
			Effect.sync(() => {
				received.push(...command.args);
				const key = command.args[0] === "auth" ? "auth" : (command.args[1] ?? "");
				const answer = answers.get(key) ?? { code: 1, err: `No answer for ${key}` };
				return { exitCode: answer.code ?? 0, stderr: answer.err ?? "", stdout: answer.out ?? "" };
			}),
	});
	return { executable: "gh", layer, answer: (key: string, answer: ScriptedAnswer) => answers.set(key, answer), received: () => received };
});
export type ScriptedGh = Effect.Success<typeof scriptedGh>;
