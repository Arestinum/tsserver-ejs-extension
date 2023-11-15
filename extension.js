// extension.js
"use strict";

Object.defineProperty(exports, "__esModule", { value: true });
const vscode = require("vscode");
const { LanguageClient, TransportKind, ServerOptions } = require("vscode-languageclient");

/**
 * 
 * @param {vscode.TextDocument} document 
 * @param {vscode.Position} position 
 * @returns {string}
 */
function getEJSText(document, position) {
    const start = new vscode.Position(position.line, 0);
    const range = new vscode.Range(start, position);
    return document.getText(range);
}

/**
 * @implements {vscode.CompletionItemProvider}
 */
class EJSCompletionItemProvider {
    /**
     * 
     * @param {vscode.TextDocument} document 
     * @param {vscode.Position} position 
     * @returns {vscode.ProviderResult<vscode.CompletionItem[]>}
     */
    provideCompletionItems(
        document,
        position
    ) {
        const ejsText = getEJSText(document, position);

        const jsCode = ejsText.match(/<%\s*([\s\S]*?)\s*%>/);
        console.log(ejsText)
        if (jsCode) {
            const completionItems = getCompletionItemsForJSCode(jsCode[1]);
            return completionItems;
        }

        return [];
    }
}

/**
 * 
 * @param {string} jsCode 
 * @returns {vscode.CompletionItem[]}
 */
async function getCompletionItemsForJSCode(jsCode) {
    /** @type {import('vscode-languageclient').ServerOptions} */
    const serverOptions = {
        run: {
            module: require.resolve('typescript-language-server/bin/tsserver'),
            transport: TransportKind.ipc
        },
        debug: {
            module: require.resolve('typescript-language-server/bin/tsserver'),
            transport: TransportKind.ipc,
            options: { execArgv: ['--nolazy', '--inspect=6009'] }
        }
    };

    const client = new LanguageClient(
        'TypeScript Language Server',
        serverOptions,
        {
            documentSelector: [{ language: 'typescript' }, { language: 'javascript' }],
            synchronize: {
                configurationSection: 'typescript'
            }
        }
    );

    // const client = new LanguageClient(
    //     "EJSTSServer",
    //     "EJS TypeScript Language Server",
    //     {
    //         command: "tsserver",
    //         args: ["--stdio"],
    //     },
    //     {
    //         documentSelector: [{ language: "javascript" }], // Adjust as needed
    //     }
    // );

    // Start the language client
    const disposable = client.start();

    // Ensure the client is stopped when your extension is deactivated
    vscode.Disposable.from(disposable);

    // Wait for the client to be ready
    await client.onReady();

    try {
        // Send a request to tsserver for completion items
        const completionItems = await client.sendRequest(
            "textDocument/completion",
            {
                textDocument: {
                    uri: document.uri.toString(), // Replace with the correct URI
                },
                position: {
                    line: 0,
                    character: jsCode.length,
                },
                context: {
                    triggerCharacter: jsCode[jsCode.length - 1],
                },
            }
            );
            // Dispose of the client
            client.stop();
        
            return completionItems;
    } catch (error) {
        console.error("Error getting completions:", error);
        return [];
    }

}

/**
 * @param {vscode.ExtensionContext} context 
 */
function activate(context) {
    console.log('"TSServer for EJS" is now active!');

    // Register the EJS completion item provider
    const provider = vscode.languages.registerCompletionItemProvider(
        { language: "html" },
        new EJSCompletionItemProvider(),
        "<%"
    );

    context.subscriptions.push(provider);
}

module.exports = {
    activate
};