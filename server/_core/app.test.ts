import { createServer } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import vercelApiHandler from "../../api/[...path]";

const servers: ReturnType<typeof createServer>[] = [];

afterEach(async () => {
  await Promise.all(
    servers.splice(0).map(
      server =>
        new Promise<void>((resolve, reject) =>
          server.close(error => (error ? reject(error) : resolve()))
        )
    )
  );
});

describe("fonction Vercel API", () => {
  it("expose un contrôle de santé JSON non mis en cache via l’entrée serverless", async () => {
    const server = createServer(vercelApiHandler);
    servers.push(server);

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Port de test indisponible");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/health`);

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({ status: "ok" });
  });

  it("transmet /api/trpc à tRPC au lieu du repli HTML de la SPA", async () => {
    const server = createServer(vercelApiHandler);
    servers.push(server);

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("Port de test indisponible");

    const response = await fetch(`http://127.0.0.1:${address.port}/api/trpc`);
    const body = await response.text();

    expect(response.headers.get("content-type")).toContain("application/json");
    expect(body).not.toContain("<!DOCTYPE html>");
  });
});
