import * as fs from "node:fs";
import * as path from "node:path";
import * as vscode from "vscode";
import {
  LanguageClient,
  State,
  TransportKind,
  type LanguageClientOptions,
  type ServerOptions
} from "vscode-languageclient/node";

let client: LanguageClient | undefined;
let outputChannel: vscode.OutputChannel | undefined;
let lastResolvedServerModule: string | undefined;
let lastActivationError: string | undefined;

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const output = vscode.window.createOutputChannel("Leia Language Server");
  outputChannel = output;
  context.subscriptions.push(output);

  output.appendLine("Activating Leia extension...");

  const serverModule = context.asAbsolutePath(
    path.join("server-dist", "packages", "leia-language-server", "src", "server.js")
  );
  lastResolvedServerModule = serverModule;
  output.appendLine(`Resolved language server entrypoint: ${serverModule}`);

  context.subscriptions.push(
    vscode.commands.registerCommand("leia.showStatus", () => {
      output.show(true);

      const stateDescription =
        client === undefined
          ? "not created"
          : describeClientState(client.state);

      const details = [
        "Leia extension status",
        `Server entrypoint: ${lastResolvedServerModule ?? "unresolved"}`,
        `Client state: ${stateDescription}`,
        `Activation error: ${lastActivationError ?? "none"}`
      ];

      output.appendLine(details.join(" | "));
      void vscode.window.showInformationMessage(
        `Leia status: client ${stateDescription}. See 'Leia Language Server' output for details.`
      );
    })
  );

  if (!fs.existsSync(serverModule)) {
    const message = `Leia language server entrypoint was not found at ${serverModule}`;
    lastActivationError = message;
    output.appendLine(message);
    vscode.window.showErrorMessage(message);
    return;
  }

  const serverOptions: ServerOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: { module: serverModule, transport: TransportKind.ipc }
  };

  const clientOptions: LanguageClientOptions = {
    outputChannelName: "Leia Language Server",
    traceOutputChannel: output,
    documentSelector: [
      { scheme: "file", language: "leia" },
      { scheme: "untitled", language: "leia" }
    ]
  };

  client = new LanguageClient(
    "leiaLanguageServer",
    "Leia Language Server",
    serverOptions,
    clientOptions
  );

  context.subscriptions.push({
    dispose: () => {
      void client?.stop();
    }
  });

  try {
    await client.start();
    lastActivationError = undefined;
    output.appendLine("Leia language server started.");
  } catch (error) {
    const message =
      error instanceof Error ? error.stack ?? error.message : String(error);
    lastActivationError = message;
    output.appendLine("Leia language server failed to start.");
    output.appendLine(message);
    vscode.window.showErrorMessage("Leia language server failed to start. See the 'Leia Language Server' output panel.");
    throw error;
  }
}

export async function deactivate(): Promise<void> {
  if (!client) {
    return;
  }

  await client.stop();
  client = undefined;
}

function describeClientState(state: State): string {
  switch (state) {
    case State.Starting:
      return "starting";
    case State.Running:
      return "running";
    case State.Stopped:
      return "stopped";
    default:
      return "unknown";
  }
}
