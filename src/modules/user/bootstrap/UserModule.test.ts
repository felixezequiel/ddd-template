import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { UserModule } from "./UserModule.ts";
import { ApplicationService } from "../../../shared/application/ApplicationService.ts";
import { DomainEventManager } from "../../../shared/application/DomainEventManager.ts";
import type { UnitOfWork } from "../../../shared/application/UnitOfWork.ts";
import type { EventPublisherPort } from "../../../shared/ports/EventPublisherPort.ts";
import { HttpServer } from "../../../shared/infrastructure/http/HttpServer.ts";

class FakeUnitOfWork implements UnitOfWork {
  public async begin(): Promise<void> {}
  public async commit(): Promise<void> {}
  public async rollback(): Promise<void> {}
}

class FakeEventPublisher implements EventPublisherPort {
  public async publish(): Promise<void> {}
  public async publishAll(): Promise<void> {}
}

const TEST_PORT = 0;

async function fetchJson(url: string, options?: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}

describe("UserModule", () => {
  let httpServer: HttpServer;

  afterEach(async () => {
    if (httpServer !== undefined) {
      await httpServer.stop();
    }
  });

  it("should register routes and handle POST /users end-to-end", async () => {
    httpServer = new HttpServer();
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();
    const applicationService = new ApplicationService(unitOfWork, eventManager, eventPublisher);

    const userModule = new UserModule(applicationService);
    userModule.registerRoutes(httpServer);

    const port = await httpServer.start(TEST_PORT);

    const result = await fetchJson("http://localhost:" + port + "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John Doe", email: "john@example.com" }),
    });

    assert.equal(result.status, 201);
    const body = result.body as { id: string; name: string; email: string };
    assert.ok(body.id.length > 0);
    assert.equal(body.name, "John Doe");
    assert.equal(body.email, "john@example.com");
  });

  it("should be self-contained with its own repository instance", async () => {
    httpServer = new HttpServer();
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();
    const applicationService = new ApplicationService(unitOfWork, eventManager, eventPublisher);

    const userModule = new UserModule(applicationService);
    userModule.registerRoutes(httpServer);

    const port = await httpServer.start(TEST_PORT);

    await fetchJson("http://localhost:" + port + "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John", email: "john@example.com" }),
    });

    const duplicateResult = await fetchJson("http://localhost:" + port + "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Jane", email: "john@example.com" }),
    });

    assert.equal(duplicateResult.status, 409);
  });
});
