import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ApplicationService } from "../../../shared/application/ApplicationService.ts";
import { DomainEventManager } from "../../../shared/application/DomainEventManager.ts";
import type { UnitOfWork } from "../../../shared/application/UnitOfWork.ts";
import type { EventPublisherPort } from "../../../shared/ports/EventPublisherPort.ts";
import type { DomainEvent } from "../../../shared/domain/events/DomainEvent.ts";
import { CreateUserUseCase } from "../application/usecase/CreateUserUseCase.ts";
import { CreateUserCommand } from "../application/command/CreateUserCommand.ts";
import { InMemoryUserRepository } from "../infrastructure/persistence/InMemoryUserRepository.ts";
import { UserId } from "../domain/identifiers/UserId.ts";

class FakeUnitOfWork implements UnitOfWork {
  public committed = false;

  public async begin(): Promise<void> {}

  public async commit(): Promise<void> {
    this.committed = true;
  }

  public async rollback(): Promise<void> {}
}

class FakeEventPublisher implements EventPublisherPort {
  public publishedEvents: Array<DomainEvent> = [];

  public async publish(event: DomainEvent): Promise<void> {
    this.publishedEvents.push(event);
  }

  public async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      this.publishedEvents.push(event);
    }
  }
}

describe("CreateUser integration", () => {
  it("should execute the full cycle: command -> useCase -> aggregate -> events -> publish", async () => {
    const userRepository = new InMemoryUserRepository();
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();
    const dispatchedEvents: Array<DomainEvent> = [];

    eventManager.register("UserCreated", async (event) => {
      dispatchedEvents.push(event);
    });

    const useCase = new CreateUserUseCase(userRepository);
    const applicationService = new ApplicationService(
      unitOfWork,
      eventManager,
      eventPublisher,
    );

    const command = CreateUserCommand.of("user-1", "John Doe", "john@example.com");
    const user = await applicationService.execute(useCase, command);

    assert.equal(user.id.value, "user-1");
    assert.equal(user.props.name, "John Doe");
    assert.equal(user.props.email.props.value, "john@example.com");

    const persistedUser = await userRepository.findById(new UserId("user-1"));
    assert.ok(persistedUser !== null);

    assert.equal(dispatchedEvents.length, 1);
    assert.equal(dispatchedEvents[0]!.eventName, "UserCreated");

    assert.equal(eventPublisher.publishedEvents.length, 1);
    assert.equal(eventPublisher.publishedEvents[0]!.eventName, "UserCreated");

    assert.ok(unitOfWork.committed);
  });

  it("should rollback when creating a user with a duplicate email", async () => {
    const userRepository = new InMemoryUserRepository();
    const unitOfWork = new FakeUnitOfWork();
    const eventManager = new DomainEventManager();
    const eventPublisher = new FakeEventPublisher();

    const useCase = new CreateUserUseCase(userRepository);
    const applicationService = new ApplicationService(
      unitOfWork,
      eventManager,
      eventPublisher,
    );

    const firstCommand = CreateUserCommand.of("user-1", "John", "john@example.com");
    await applicationService.execute(useCase, firstCommand);

    const duplicateCommand = CreateUserCommand.of("user-2", "Jane", "john@example.com");
    await assert.rejects(
      () => applicationService.execute(useCase, duplicateCommand),
      { message: "User with email john@example.com already exists" },
    );

    const nonExistentUser = await userRepository.findById(new UserId("user-2"));
    assert.equal(nonExistentUser, null);
  });
});
