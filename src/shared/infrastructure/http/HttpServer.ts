import { createServer, type IncomingMessage, type ServerResponse, type Server } from "node:http";

export interface HttpRoute {
  readonly method: string;
  readonly path: string;
  readonly handler: RouteHandler;
}

export interface HttpResponse {
  readonly statusCode: number;
  readonly body: unknown;
}

export type RouteHandler = (requestBody: Record<string, unknown>) => Promise<HttpResponse>;

export class HttpServer {
  private readonly routes: Array<HttpRoute> = [];
  private server: Server | undefined;

  public post(path: string, handler: RouteHandler): void {
    this.routes.push({ method: "POST", path, handler });
  }

  public start(port: number): Promise<number> {
    return new Promise((resolve) => {
      this.server = createServer((request, response) => {
        this.handleRequest(request, response);
      });

      this.server.listen(port, () => {
        const address = this.server!.address();
        const assignedPort = typeof address === "object" && address !== null
          ? address.port
          : port;
        resolve(assignedPort);
      });
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.server === undefined) {
        resolve();
        return;
      }

      this.server.close((error) => {
        this.server = undefined;
        if (error !== undefined && error !== null) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  private handleRequest(request: IncomingMessage, response: ServerResponse): void {
    const route = this.findRoute(request.method, request.url);

    if (route === undefined) {
      this.sendJson(response, 404, { error: "Not Found" });
      return;
    }

    this.readBody(request).then((body) => {
      return route.handler(body);
    }).then((result) => {
      this.sendJson(response, result.statusCode, result.body);
    }).catch((error: Error) => {
      this.sendJson(response, 500, { error: error.message });
    });
  }

  private findRoute(method: string | undefined, url: string | undefined): HttpRoute | undefined {
    for (const route of this.routes) {
      if (route.method === method && route.path === url) {
        return route;
      }
    }
    return undefined;
  }

  private readBody(request: IncomingMessage): Promise<Record<string, unknown>> {
    return new Promise((resolve) => {
      let data = "";

      request.on("data", (chunk: Buffer) => {
        data = data + chunk.toString();
      });

      request.on("end", () => {
        if (data.length === 0) {
          resolve({});
          return;
        }

        const parsed = JSON.parse(data) as Record<string, unknown>;
        resolve(parsed);
      });
    });
  }

  private sendJson(response: ServerResponse, statusCode: number, body: unknown): void {
    response.writeHead(statusCode, { "Content-Type": "application/json" });
    response.end(JSON.stringify(body));
  }
}
