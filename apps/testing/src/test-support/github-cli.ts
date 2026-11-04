import { GhUnavailable } from "@antumbra/edge-github/errors.ts";
import { GhProcess } from "@antumbra/edge-github/process.ts";
import { Effect, Layer } from "effect";

interface State {
	authenticated: boolean;
	creates: (readonly string[])[];
	created: boolean;
	loseCreateAnswer: boolean;
}
const status = (state: State) => ({
	exitCode: state.authenticated ? 0 : 4,
	stderr: state.authenticated ? "" : "Run gh auth login",
	stdout: state.authenticated ? "Logged in to GitHub account skipper (keyring)" : "",
});
const token = (state: State) => ({
	exitCode: state.authenticated ? 0 : 4,
	stderr: state.authenticated ? "" : "Run gh auth login",
	stdout: state.authenticated ? "loopback-token" : "",
});
const create = (state: State, args: readonly string[]) => {
	state.creates.push(args);
	state.created = true;
	return state.loseCreateAnswer
		? { exitCode: 1, stderr: "connection reset", stdout: "" }
		: { exitCode: 0, stderr: "", stdout: "https://github.com/ShivaeDev/antumbra/pull/23" };
};
export const githubCli = Effect.sync(() => {
	const state: State = { authenticated: true, creates: [], created: false, loseCreateAnswer: false };
	const layer = Layer.succeed(GhProcess, {
		run: (command) =>
			Effect.suspend(() => {
				switch (command.operation) {
					case "auth-status":
						return Effect.succeed(status(state));
					case "auth-token":
						return Effect.succeed(token(state));
					case "create-change":
						return Effect.succeed(create(state, command.args));
					default:
						return Effect.fail(new GhUnavailable({ operation: command.operation, detail: "Unexpected CLI operation in the GitHub story" }));
				}
			}),
	});
	return { state, layer };
});
