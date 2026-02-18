import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { CreateUserUseCase } from "./CreateUserUseCase.ts";
import { CreateUserCommand } from "../command/CreateUserCommand.ts";
import type { UserRepositoryPort } from "../port/secondary/UserRepositoryPort.ts";
import type { UserId } from "../../domain/identifiers/UserId.ts";
import type { User } from "../../domain/aggregates/User.ts";

class InMemoryUserRepository implements UserRepositoryPort {
  private users: Array<User> = [];

  public async save(user: User): Promise<void> {
    this.users.push(user);
  }

  public async findById(id: UserId): Promise<User | null> {
    const found = this.users.find((user) => user.id.equals(id));
    return found ?? null;
  }

  public async findByEmail(email: string): Promise<User | null> {
    const found = this.users.find((user) => user.props.email.props.value === email);
    return found ?? null;
  }

  public async delete(): Promise<void> {
    // no-op for tests
  }
}

describe("CreateUserUseCase", () => {
  it("should create a user and save it to the repository", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new CreateUserUseCase(repository);
    const command = CreateUserCommand.of("user-1", "John Doe", "john@example.com");

    const result = await useCase.execute(command);

    assert.equal(result.result.id.value, "user-1");
    assert.equal(result.result.props.name, "John Doe");

    const savedUser = await repository.findById(result.result.id);
    assert.ok(savedUser !== null);
  });

  it("should return the created user as an aggregate in the result", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new CreateUserUseCase(repository);
    const command = CreateUserCommand.of("user-1", "John Doe", "john@example.com");

    const result = await useCase.execute(command);

    assert.equal(result.aggregates.length, 1);
    assert.equal(result.aggregates[0]!.id.value, "user-1");
  });

  it("should throw when a user with the same email already exists", async () => {
    const repository = new InMemoryUserRepository();
    const useCase = new CreateUserUseCase(repository);

    const firstCommand = CreateUserCommand.of("user-1", "John", "john@example.com");
    await useCase.execute(firstCommand);

    const duplicateCommand = CreateUserCommand.of("user-2", "Jane", "john@example.com");

    await assert.rejects(
      () => useCase.execute(duplicateCommand),
      { message: "User with email john@example.com already exists" },
    );
  });
});
