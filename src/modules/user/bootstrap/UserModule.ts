import type { ApplicationService } from "../../../shared/application/ApplicationService.ts";
import type { HttpServer } from "../../../shared/infrastructure/http/HttpServer.ts";
import { InMemoryUserRepository } from "../infrastructure/persistence/InMemoryUserRepository.ts";
import { CreateUserUseCase } from "../application/usecase/CreateUserUseCase.ts";
import { CreateUserController } from "../infrastructure/http/CreateUserController.ts";

export class UserModule {
  private readonly applicationService: ApplicationService;

  constructor(applicationService: ApplicationService) {
    this.applicationService = applicationService;
  }

  public registerRoutes(httpServer: HttpServer): void {
    const userRepository = new InMemoryUserRepository();
    const createUserUseCase = new CreateUserUseCase(userRepository);
    const createUserController = new CreateUserController(this.applicationService, createUserUseCase);

    httpServer.post("/users", async (requestBody) => {
      return createUserController.handle(requestBody);
    });
  }
}
