import type { ApplicationService } from "../../../shared/application/ApplicationService.ts";
import type { HttpServer } from "../../../shared/infrastructure/http/HttpServer.ts";
import type { GraphqlServer } from "../../../shared/infrastructure/graphql/GraphqlServer.ts";
import type { EventEmitterEventBus } from "../../../shared/infrastructure/events/EventEmitterEventBus.ts";
import type { LoggerPort } from "../../../shared/ports/LoggerPort.ts";
import type { UserCreatedEvent } from "../domain/events/UserCreatedEvent.ts";
import { InMemoryUserRepository } from "../infrastructure/persistence/InMemoryUserRepository.ts";
import { CreateUserUseCase } from "../application/usecase/CreateUserUseCase.ts";
import { SendWelcomeEmailUseCase } from "../application/usecase/SendWelcomeEmailUseCase.ts";
import { SendWelcomeEmailCommand } from "../application/command/SendWelcomeEmailCommand.ts";
import { ConsoleEmailNotification } from "../infrastructure/notifications/ConsoleEmailNotification.ts";
import { CreateUserController } from "../infrastructure/http/CreateUserController.ts";
import { CreateUserResolver } from "../infrastructure/graphql/CreateUserResolver.ts";

export class UserModule {
  private readonly applicationService: ApplicationService;
  private readonly createUserUseCase: CreateUserUseCase;

  constructor(applicationService: ApplicationService) {
    this.applicationService = applicationService;

    const userRepository = new InMemoryUserRepository();
    this.createUserUseCase = new CreateUserUseCase(userRepository);
  }

  public registerEventHandlers(eventBus: EventEmitterEventBus, logger: LoggerPort): void {
    const emailNotification = new ConsoleEmailNotification(logger);
    const sendWelcomeEmailUseCase = new SendWelcomeEmailUseCase(emailNotification);

    eventBus.subscribe("UserCreated", async (event) => {
      const userCreatedEvent = event as UserCreatedEvent;
      const command = SendWelcomeEmailCommand.of(
        userCreatedEvent.aggregateId,
        userCreatedEvent.email,
      );
      await this.applicationService.execute(sendWelcomeEmailUseCase, command);
    });
  }

  public registerRoutes(httpServer: HttpServer): void {
    const createUserController = new CreateUserController(this.applicationService, this.createUserUseCase);

    httpServer.post("/users", async (requestBody) => {
      return createUserController.handle(requestBody);
    });
  }

  public registerResolvers(graphqlServer: GraphqlServer): void {
    const createUserResolver = new CreateUserResolver(this.applicationService, this.createUserUseCase);

    graphqlServer.addSchema(createUserResolver.schemaFragment, {
      Mutation: {
        createUser: async (_parent: unknown, args: { input: { name: string; email: string } }) => {
          return createUserResolver.resolve(args.input);
        },
      },
    });
  }
}
