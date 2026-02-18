import type { ApplicationService } from "../../../shared/application/ApplicationService.ts";
import type { HttpServer } from "../../../shared/infrastructure/http/HttpServer.ts";
import type { GraphqlServer } from "../../../shared/infrastructure/graphql/GraphqlServer.ts";
import { InMemoryUserRepository } from "../infrastructure/persistence/InMemoryUserRepository.ts";
import { CreateUserUseCase } from "../application/usecase/CreateUserUseCase.ts";
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
