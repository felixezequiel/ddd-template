import { HttpServer } from "./shared/infrastructure/http/HttpServer.ts";
import { ApplicationService } from "./shared/application/ApplicationService.ts";
import { DomainEventManager } from "./shared/application/DomainEventManager.ts";
import { NoOpUnitOfWork } from "./shared/infrastructure/NoOpUnitOfWork.ts";
import { LoggingEventPublisher } from "./shared/infrastructure/LoggingEventPublisher.ts";
import { ConsoleLogger } from "./shared/infrastructure/logging/ConsoleLogger.ts";
import { UserModule } from "./modules/user/bootstrap/UserModule.ts";

/**
 * Composition Root — Monolith entry point.
 *
 * Each module is a self-contained vertical slice:
 *   - Owns its domain, application, and infrastructure layers
 *   - Registers its own HTTP routes
 *   - Can be extracted to a standalone microservice by replacing
 *     this composition root with its own main + dedicated HTTP server
 *
 * Shared infrastructure (UnitOfWork, EventPublisher, Logger) is provided
 * by the monolith and injected into each module's ApplicationService.
 *
 * Adding a new adapter (GraphQL, Broker, CLI) means adding a new
 * registerXxx() method to each module — the use cases remain unchanged.
 */

const DEFAULT_PORT = 3000;

async function main(): Promise<void> {
  const logger = new ConsoleLogger();

  // --- Shared infrastructure (monolith provides these) ---
  const unitOfWork = new NoOpUnitOfWork();
  const domainEventManager = new DomainEventManager();
  const eventPublisher = new LoggingEventPublisher(logger);
  const applicationService = new ApplicationService(unitOfWork, domainEventManager, eventPublisher);

  // --- HTTP server ---
  const httpServer = new HttpServer();

  // --- Module registration (vertical slices) ---
  // Each module wires its own dependencies and registers routes.
  // To add a new bounded context, create a new module and register it here.
  const userModule = new UserModule(applicationService);
  userModule.registerRoutes(httpServer);

  // Future modules:
  // const orderModule = new OrderModule(applicationService);
  // orderModule.registerRoutes(httpServer);

  // Future adapters (same modules, different entry points):
  // userModule.registerGraphQL(graphqlServer);
  // userModule.registerBrokerConsumers(messageBroker);
  // userModule.registerCli(cliRouter);

  // --- Start ---
  const port = await httpServer.start(DEFAULT_PORT);
  logger.info("Server started", { port, url: "http://localhost:" + port });
  logger.info("Available routes:", {
    "POST /users": "Create a new user",
  });
}

main();
