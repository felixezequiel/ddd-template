import { describe, it, afterEach } from "node:test";
import assert from "node:assert/strict";
import { UserModule } from "./UserModule.ts";
import { ApplicationService } from "../../../shared/application/ApplicationService.ts";
import { DomainEventManager } from "../../../shared/application/DomainEventManager.ts";
import type { UnitOfWork } from "../../../shared/application/UnitOfWork.ts";
import type { EventPublisherPort } from "../../../shared/ports/EventPublisherPort.ts";
import type { LoggerPort } from "../../../shared/ports/LoggerPort.ts";
import { EventEmitterEventBus } from "../../../shared/infrastructure/events/EventEmitterEventBus.ts";
import { HttpServer } from "../../../shared/infrastructure/http/HttpServer.ts";
import { GraphqlServer } from "../../../shared/infrastructure/graphql/GraphqlServer.ts";

class FakeUnitOfWork implements UnitOfWork {
  public async begin(): Promise<void> {}
  public async commit(): Promise<void> {}
  public async rollback(): Promise<void> {}
}

class FakeEventPublisher implements EventPublisherPort {
  public async publish(): Promise<void> {}
  public async publishAll(): Promise<void> {}
}

class FakeLogger implements LoggerPort {
  public messages: Array<{ level: string; message: string; context?: Record<string, unknown> | undefined }> = [];

  public info(message: string, context?: Record<string, unknown>): void {
    this.messages.push({ level: "info", message, context });
  }
  public warn(): void {}
  public error(): void {}
  public debug(): void {}
}

const TEST_PORT = 0;

async function fetchJson(url: string, options?: RequestInit): Promise<{ status: number; body: unknown }> {
  const response = await fetch(url, options);
  const body = await response.json();
  return { status: response.status, body };
}

describe("UserModule", () => {
  let httpServer: HttpServer;
  let graphqlServer: GraphqlServer;

  afterEach(async () => {
    if (httpServer !== undefined) {
      await httpServer.stop();
    }
    if (graphqlServer !== undefined) {
      await graphqlServer.stop();
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

  it("should register GraphQL resolvers and handle createUser mutation", async () => {
    graphqlServer = new GraphqlServer();
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();
    const applicationService = new ApplicationService(unitOfWork, eventManager, eventPublisher);

    const userModule = new UserModule(applicationService);
    userModule.registerResolvers(graphqlServer);

    const port = await graphqlServer.start(TEST_PORT);

    const mutation = `mutation {
      createUser(input: { name: "John Doe", email: "john@example.com" }) {
        id
        name
        email
      }
    }`;

    const result = await fetchJson("http://localhost:" + port + "/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: mutation }),
    });

    assert.equal(result.status, 200);
    const body = result.body as { data: { createUser: { id: string; name: string; email: string } } };
    assert.ok(body.data.createUser.id.length > 0);
    assert.equal(body.data.createUser.name, "John Doe");
    assert.equal(body.data.createUser.email, "john@example.com");
  });

  it("should register event handlers and react to UserCreated event", async () => {
    httpServer = new HttpServer();
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventBus = new EventEmitterEventBus();
    const fakeLogger = new FakeLogger();
    const applicationService = new ApplicationService(unitOfWork, eventManager, eventBus);

    const userModule = new UserModule(applicationService);
    userModule.registerEventHandlers(eventBus, fakeLogger);
    userModule.registerRoutes(httpServer);

    const port = await httpServer.start(TEST_PORT);

    await fetchJson("http://localhost:" + port + "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John Doe", email: "john@example.com" }),
    });

    const welcomeEmailLog = fakeLogger.messages.find(
      (log) => log.message === "Sending welcome email",
    );
    assert.ok(welcomeEmailLog !== undefined);
    assert.equal((welcomeEmailLog.context as { email: string }).email, "john@example.com");
  });

  it("should share the same repository between REST and GraphQL adapters", async () => {
    httpServer = new HttpServer();
    graphqlServer = new GraphqlServer();
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();
    const applicationService = new ApplicationService(unitOfWork, eventManager, eventPublisher);

    const userModule = new UserModule(applicationService);
    userModule.registerRoutes(httpServer);
    userModule.registerResolvers(graphqlServer);

    const httpPort = await httpServer.start(TEST_PORT);
    const graphqlPort = await graphqlServer.start(TEST_PORT);

    await fetchJson("http://localhost:" + httpPort + "/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "John", email: "john@example.com" }),
    });

    const mutation = `mutation {
      createUser(input: { name: "Jane", email: "john@example.com" }) {
        id
      }
    }`;

    const graphqlResult = await fetchJson("http://localhost:" + graphqlPort + "/graphql", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query: mutation }),
    });

    assert.equal(graphqlResult.status, 200);
    const body = graphqlResult.body as { errors: Array<{ message: string }> };
    assert.ok(body.errors.length > 0);
    assert.ok(body.errors[0]!.message.includes("already exists"));
  });
});
