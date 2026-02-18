import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateUserResolver } from "./CreateUserResolver.ts";
import { ApplicationService } from "../../../../shared/application/ApplicationService.ts";
import { DomainEventManager } from "../../../../shared/application/DomainEventManager.ts";
import type { UnitOfWork } from "../../../../shared/application/UnitOfWork.ts";
import type { EventPublisherPort } from "../../../../shared/ports/EventPublisherPort.ts";
import { CreateUserUseCase } from "../../application/usecase/CreateUserUseCase.ts";
import { InMemoryUserRepository } from "../persistence/InMemoryUserRepository.ts";

class FakeUnitOfWork implements UnitOfWork {
  public async begin(): Promise<void> {}
  public async commit(): Promise<void> {}
  public async rollback(): Promise<void> {}
}

class FakeEventPublisher implements EventPublisherPort {
  public async publish(): Promise<void> {}
  public async publishAll(): Promise<void> {}
}

function createTestDependencies() {
  const userRepository = new InMemoryUserRepository();
  const unitOfWork = new FakeUnitOfWork();
  const eventManager = new DomainEventManager();
  const eventPublisher = new FakeEventPublisher();
  const applicationService = new ApplicationService(unitOfWork, eventManager, eventPublisher);
  const createUserUseCase = new CreateUserUseCase(userRepository);
  const resolver = new CreateUserResolver(applicationService, createUserUseCase);

  return { resolver, userRepository };
}

describe("CreateUserResolver", () => {
  it("should return created user data", async () => {
    const { resolver } = createTestDependencies();

    const result = await resolver.resolve({ name: "John Doe", email: "john@example.com" });

    assert.ok(result.id.length > 0);
    assert.equal(result.name, "John Doe");
    assert.equal(result.email, "john@example.com");
  });

  it("should throw when email already exists", async () => {
    const { resolver } = createTestDependencies();

    await resolver.resolve({ name: "John", email: "john@example.com" });

    await assert.rejects(
      () => resolver.resolve({ name: "Jane", email: "john@example.com" }),
      { message: "User with email john@example.com already exists" },
    );
  });

  it("should throw when email format is invalid", async () => {
    const { resolver } = createTestDependencies();

    await assert.rejects(
      () => resolver.resolve({ name: "John", email: "invalid" }),
      (error: Error) => error.message.includes("Invalid email"),
    );
  });

  it("should expose the schema fragment with createUser mutation", () => {
    const { resolver } = createTestDependencies();

    const schema = resolver.schemaFragment;

    assert.ok(schema.includes("createUser"));
    assert.ok(schema.includes("CreateUserInput"));
    assert.ok(schema.includes("CreateUserPayload"));
  });
});
