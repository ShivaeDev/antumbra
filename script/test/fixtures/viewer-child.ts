import { randomUUID } from "node:crypto";
import { createServer } from "node:http";

const token = randomUUID();
let failure: string | null = null;
const server = createServer((request, response) => {
	if (request.headers.authorization !== `Bearer ${token}`) {
		response.writeHead(401).end();
		return;
	}
	response.setHeader("content-type", "application/json");
	if (request.url === "/__fixture/stop") {
		response.end(JSON.stringify({ stopped: true }));
		server.close();
	} else {
		if (request.url === "/fail") failure = "Fixture server exited.";
		response.end(JSON.stringify({ token, failure }));
	}
});
server.listen(0, "127.0.0.1", () => {
	const address = server.address();
	if (address && typeof address !== "string") process.send?.({ url: `http://127.0.0.1:${address.port}`, token });
});
