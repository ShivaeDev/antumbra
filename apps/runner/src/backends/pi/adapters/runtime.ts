import { piFailure } from "@antumbra/runner-backends-pi/failure.ts";
import type { PiModel, PiOpenRequest, PiRuntime, PiSession } from "@antumbra/runner-backends-pi/runtime.ts";
import {
	type AgentSession,
	createAgentSession,
	DefaultResourceLoader,
	getAgentDir,
	ModelRuntime,
	SessionManager,
} from "@earendil-works/pi-coding-agent";
import { Effect } from "effect";

interface PiRuntimeOptions {
	readonly skills: string;
}

type CatalogModel = Awaited<ReturnType<ModelRuntime["getAvailable"]>>[number];

const available = (): Promise<readonly CatalogModel[]> => ModelRuntime.create().then((runtime) => runtime.getAvailable());

const chosenModel = async (runtime: ModelRuntime, id: string): Promise<CatalogModel> => {
	const separator = id.indexOf("/");
	const models = await runtime.getAvailable();
	const found =
		separator <= 0 ? undefined : models.find((model) => model.provider === id.slice(0, separator) && model.id === id.slice(separator + 1));
	if (found === undefined) {
		throw new Error(`pi offers no model ${id} with credentials; name one of provider/model-id from its catalog`);
	}
	return found;
};

export const sessions = (request: PiOpenRequest): SessionManager =>
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
		abort: Effect.promise(() => session.abort()),
		dispose: Effect.sync(() => session.dispose()),
		prompt: (text, delivery) => Effect.tryPromise({ catch: piFailure, try: () => sendTo(session)(text, delivery) }),
		sessionFile,
		sessionId: session.sessionId,
		subscribe: (listener) => session.subscribe(listener),
	};
};

export const loadedResources = (request: PiOpenRequest, skills: string) =>
	request.constrainedPrompt === undefined
		? { additionalSkillPaths: [skills] }
		: {
				noContextFiles: true,
				noExtensions: true,
				noPromptTemplates: true,
				noSkills: true,
				noThemes: true,
				systemPrompt: request.constrainedPrompt,
			};

// pi reads an explicit tool list as the whole allowlist: naming Antumbra's tools leaves its built-ins out, and an empty list leaves no tools at all.
export const chosenTools = (request: PiOpenRequest) =>
	request.constrainedPrompt === undefined ? {} : { tools: request.tools.map((tool) => tool.name) };

const open =
	(options: PiRuntimeOptions) =>
	async (request: PiOpenRequest): Promise<PiSession> => {
		const modelRuntime = await ModelRuntime.create();
		const model = await chosenModel(modelRuntime, request.model);
		const resourceLoader = new DefaultResourceLoader({
			agentDir: getAgentDir(),
			cwd: request.cwd,
			...loadedResources(request, options.skills),
		});
		await resourceLoader.reload();
		const { session } = await createAgentSession({
			agentDir: getAgentDir(),
			customTools: [...request.tools],
			cwd: request.cwd,
			modelRuntime,
			resourceLoader,
			sessionManager: sessions(request),
			...chosenTools(request),
			model,
			...(request.effort === undefined ? {} : { thinkingLevel: request.effort }),
		});
		return adopt(session);
	};

const models = (): Promise<ReadonlyArray<PiModel>> =>
	available().then((catalog) => catalog.map((model) => ({ id: `${model.provider}/${model.id}`, name: `${model.name} (${model.provider})` })));

export const piRuntime = (options: PiRuntimeOptions): PiRuntime => ({
	models: Effect.promise(models),
	open: (request) => Effect.promise(() => open(options)(request)),
});
