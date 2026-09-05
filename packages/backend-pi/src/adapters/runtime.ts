import {
	type AgentSession,
	AuthStorage,
	createAgentSession,
	DefaultResourceLoader,
	getAgentDir,
	ModelRegistry,
	SessionManager,
} from "@mariozechner/pi-coding-agent";
import type { PiModel, PiOpenRequest, PiRuntime, PiSession } from "#runtime.ts";

interface PiRuntimeOptions {
	readonly skills: string;
}

const catalog = (): ModelRegistry => ModelRegistry.create(AuthStorage.create());

const chosenModel = (registry: ModelRegistry, id: string | undefined) => {
	if (id === undefined) {
		return undefined;
	}
	const separator = id.indexOf("/");
	const found = separator <= 0 ? undefined : registry.find(id.slice(0, separator), id.slice(separator + 1));
	if (found === undefined) {
		throw new Error(`pi offers no model ${id} with credentials; name one of provider/model-id from its catalog`);
	}
	return found;
};

const sessions = (request: PiOpenRequest): SessionManager =>
	request.resume === undefined ? SessionManager.create(request.cwd) : SessionManager.open(request.resume, undefined, request.cwd);

// pi settles its prompt promise only when the run it starts is over; the preflight hook is the moment pi accepted the text.
const sendTo =
	(session: AgentSession) =>
	(text: string, delivery: "followUp" | "steer"): Promise<void> =>
		new Promise((accepted, refused) => {
			const preflightResult = (ok: boolean) => {
				if (ok) {
					accepted();
				}
			};
			session.prompt(text, { preflightResult, streamingBehavior: delivery }).then(() => accepted(), refused);
		});

const adopt = (session: AgentSession): PiSession => {
	const sessionFile = session.sessionFile;
	if (sessionFile === undefined) {
		throw new Error("pi opened a session that persists nothing, so nothing could resume it");
	}
	return {
		abort: () => session.abort(),
		dispose: () => session.dispose(),
		prompt: sendTo(session),
		sessionFile,
		sessionId: session.sessionId,
		subscribe: (listener) => session.subscribe(listener),
	};
};

const open =
	(options: PiRuntimeOptions) =>
	async (request: PiOpenRequest): Promise<PiSession> => {
		const registry = catalog();
		const model = chosenModel(registry, request.model);
		const resourceLoader = new DefaultResourceLoader({
			additionalSkillPaths: [options.skills],
			agentDir: getAgentDir(),
			cwd: request.cwd,
		});
		await resourceLoader.reload();
		const { session } = await createAgentSession({
			customTools: [...request.tools],
			cwd: request.cwd,
			modelRegistry: registry,
			resourceLoader,
			sessionManager: sessions(request),
			...(model === undefined ? {} : { model }),
			...(request.effort === undefined ? {} : { thinkingLevel: request.effort }),
		});
		return adopt(session);
	};

const models = (): ReadonlyArray<PiModel> =>
	catalog()
		.getAvailable()
		.map((model) => ({ id: `${model.provider}/${model.id}`, name: `${model.name} (${model.provider})` }));

export const piRuntime = (options: PiRuntimeOptions): PiRuntime => ({ models, open: open(options) });
