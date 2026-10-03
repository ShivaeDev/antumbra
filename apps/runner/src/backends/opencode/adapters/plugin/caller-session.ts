export default async () => ({
	"tool.execute.before": async (input: { tool: string; sessionID: string; callID: string }, output: { args: Record<string, unknown> }) => {
		if (input.tool.startsWith("antumbra_")) {
			output.args.callerSession = input.sessionID;
			output.args.callerCall = input.callID;
		}
	},
});
