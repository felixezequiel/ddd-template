import type { UseCaseResult } from "../../../../shared/application/UseCase.ts";
import type { CreateUserPort } from "../port/primary/CreateUserPort.ts";
import type { UserRepositoryPort } from "../port/secondary/UserRepositoryPort.ts";
import type { CreateUserCommand } from "../command/CreateUserCommand.ts";
import { User } from "../../domain/aggregates/User.ts";

export class CreateUserUseCase implements CreateUserPort {
  private readonly userRepository: UserRepositoryPort;

  constructor(userRepository: UserRepositoryPort) {
    this.userRepository = userRepository;
  }

  public async execute(command: CreateUserCommand): Promise<UseCaseResult<User>> {
    const emailValue = command.email.props.value;
    const existingUser = await this.userRepository.findByEmail(emailValue);

    if (existingUser !== null) {
      throw new Error("User with email " + emailValue + " already exists");
    }

    const user = User.create(command.userId, command.name, command.email);

    await this.userRepository.save(user);

    return { result: user, aggregates: [user] };
  }
}
