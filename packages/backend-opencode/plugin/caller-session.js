export default async () => ({
	"tool.execute.before": async (input, output) => {
		if (input.tool.startsWith("antumbra_")) {
			output.args.callerSession = input.sessionID;
		}
	},
});
