import { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ApplicationService } from "../../../shared/application/ApplicationService.ts";
import { DomainEventManager } from "../../../shared/application/DomainEventManager.ts";
import { EventEmitterEventBus } from "../../../shared/infrastructure/events/EventEmitterEventBus.ts";
import { AggregateRoot } from "../../../shared/domain/aggregates/AggregateRoot.ts";
import { AggregateTracker } from "../../../shared/infrastructure/persistence/AggregateTracker.ts";
import { InMemoryUnitOfWork } from "../../../shared/infrastructure/persistence/adapters/InMemoryUnitOfWork.ts";
import { CreateUserUseCase } from "../application/usecase/CreateUserUseCase.ts";
import { SendWelcomeEmailUseCase } from "../application/usecase/SendWelcomeEmailUseCase.ts";
import { CreateUserCommand } from "../application/command/CreateUserCommand.ts";
import { SendWelcomeEmailCommand } from "../application/command/SendWelcomeEmailCommand.ts";
import { InMemoryUserRepository } from "../infrastructure/persistence/in-memory/InMemoryUserRepository.ts";
import { User } from "../domain/aggregates/User.ts";
import type { EmailNotificationPort } from "../application/port/secondary/EmailNotificationPort.ts";
import type { UserCreatedEvent } from "../domain/events/UserCreatedEvent.ts";

class FakeEmailNotification implements EmailNotificationPort {
  public sentEmails: Array<{ email: string; userId: string }> = [];

  public async sendWelcomeEmail(email: string, userId: string): Promise<void> {
    this.sentEmails.push({ email, userId });
  }
}

function createUserRepositoryAdapter(repository: InMemoryUserRepository) {
  return {
    supports: (aggregate: AggregateRoot<import("../../../shared/domain/identifiers/Identifier.ts").Identifier, object>) => aggregate instanceof User,
    save: (aggregate: AggregateRoot<import("../../../shared/domain/identifiers/Identifier.ts").Identifier, object>) => repository.save(aggregate as User),
  };
}

describe("User domain events integration", () => {
  beforeEach(() => {
    AggregateRoot.setOnTrack((aggregate) => {
      AggregateTracker.track(aggregate);
    });
  });

  afterEach(() => {
    AggregateRoot.setOnTrack(null);
  });

  it("should send a welcome email when a user is created", async () => {
    const userRepository = new InMemoryUserRepository();
    const unitOfWork = new InMemoryUnitOfWork([createUserRepositoryAdapter(userRepository)]);
    const domainEventManager = new DomainEventManager();
    const eventBus = new EventEmitterEventBus();

    const applicationService = new ApplicationService(unitOfWork, domainEventManager, eventBus);

    const createUserUseCase = new CreateUserUseCase(userRepository);

    const fakeEmailNotification = new FakeEmailNotification();
    const sendWelcomeEmailUseCase = new SendWelcomeEmailUseCase(fakeEmailNotification);

    eventBus.subscribe("UserCreated", async (event) => {
      const userCreatedEvent = event as UserCreatedEvent;
      const command = SendWelcomeEmailCommand.of(
        userCreatedEvent.aggregateId,
        userCreatedEvent.email,
      );
      await applicationService.execute(sendWelcomeEmailUseCase, command);
    });

    const createCommand = CreateUserCommand.of("user-1", "John Doe", "john@example.com");
    await applicationService.execute(createUserUseCase, createCommand);

    assert.equal(fakeEmailNotification.sentEmails.length, 1);
    assert.equal(fakeEmailNotification.sentEmails[0]!.email, "john@example.com");
    assert.equal(fakeEmailNotification.sentEmails[0]!.userId, "user-1");
  });

  it("should not send a welcome email when user creation fails", async () => {
    const userRepository = new InMemoryUserRepository();
    const unitOfWork = new InMemoryUnitOfWork([createUserRepositoryAdapter(userRepository)]);
    const domainEventManager = new DomainEventManager();
    const eventBus = new EventEmitterEventBus();

    const applicationService = new ApplicationService(unitOfWork, domainEventManager, eventBus);

    const createUserUseCase = new CreateUserUseCase(userRepository);

    const fakeEmailNotification = new FakeEmailNotification();
    const sendWelcomeEmailUseCase = new SendWelcomeEmailUseCase(fakeEmailNotification);

    eventBus.subscribe("UserCreated", async (event) => {
      const userCreatedEvent = event as UserCreatedEvent;
      const command = SendWelcomeEmailCommand.of(
        userCreatedEvent.aggregateId,
        userCreatedEvent.email,
      );
      await applicationService.execute(sendWelcomeEmailUseCase, command);
    });

    const firstCommand = CreateUserCommand.of("user-1", "John", "john@example.com");
    await applicationService.execute(createUserUseCase, firstCommand);

    const duplicateCommand = CreateUserCommand.of("user-2", "Jane", "john@example.com");
    await assert.rejects(
      () => applicationService.execute(createUserUseCase, duplicateCommand),
      { message: "User with email john@example.com already exists" },
    );

    assert.equal(fakeEmailNotification.sentEmails.length, 1);
  });
});
