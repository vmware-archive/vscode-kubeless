'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as path from 'path';
import * as os from 'os';
import * as _ from 'lodash';

interface func {
    id: string,
    handler: string;
    trigger: string;
    topic?: string;
    fileName: string;
    runtime: string;
}

const logChannels = {};
function getFunction(fileName: string, funcText: string, languageId: string,) {
    const config = vscode.workspace.getConfiguration();
    let func = {
        id: null,
        handler: null,
        trigger: null,
        fileName: fileName,
        runtime: null,
    };
    return new Promise((resolve) => {
        if (config.kubeless && config.kubeless.functions) {
            // Look for the current file in the defined functions
            // TODO: If there is more than one function defined this doesn't work
            func = _.find(config.kubeless.functions, f => {
                return f.fileName === fileName;
            }) || func;
        }
        const handlerFile = path.basename(fileName).split('.')[0];
        switch (languageId) {
            case 'python':
                func.runtime = func.runtime || 'python2.7';
                break;
            // TODO: Add support for the other runtimes
            // case 'nodejs':
            //     runtime = 'nodejs6';
            //     break;
            // case 'ruby':
            //     runtime = 'ruby2.4';
            //     break;
            default:
                vscode.window.showErrorMessage(`Language ${languageId} is not supported`);
                throw new Error();
        }
        if (!func.id) {
            if (funcText.match(/^def ([^\(]*)/g).length <= 0) {
                vscode.window.showInputBox({ prompt: 'Which function do you want to deploy?' })
                    .then(val => {
                        func.id = val;
                        func.handler = func.handler || `${handlerFile}.${func.id}`;
                        resolve(func);
                    });
            } else {
                func.id = funcText.match(/^def ([^\(]*)/m)[1];
                func.handler = func.handler || `${handlerFile}.${func.id}`;
                resolve(func);
            }
        } else {
            func.handler = func.handler || `${handlerFile}.${func.id}`;
            resolve(func);
        }
    });
}
 
function deploy(f: func) {
    // TODO: Make call to Kubernetes API instead
    child_process.exec(
        `kubeless function deploy ${f.id} ` +
        `--runtime ${f.runtime} ` +
        `--handler ${f.handler} ` +
        `--trigger-${f.trigger || 'http'} ${f.topic || ''}` +
        `--from-file ${f.fileName} `, (err, stdout) => {
            if (err) {
                vscode.window.showErrorMessage(`ERROR!\n${stdout}`, {modal: true});
                return;
            }
            vscode.window.showInformationMessage(`Function ${f.id} deployed`);
        }
    );
}

function update(f: func) {
    // TODO: Make call to Kubernetes API instead
    console.log(process.cwd());
    child_process.exec(
        `kubeless function update ${f.id} ` +
        `--runtime ${f.runtime} ` +
        `--handler ${f.handler} ` +
        `--from-file ${f.fileName} `,
        { cwd: os.tmpdir() },
        (err, stdout) => {
            if (err) {
                vscode.window.showErrorMessage(`ERROR!\n${stdout}`, { modal: true });
                return;
            }
            vscode.window.showInformationMessage(`Function ${f.id} updated`);
        }
    );
}

function call(funcName: string) {
    // TODO: Make call to Kubernetes API instead
    let command = `kubeless function call ${funcName} `
    let data = null;
    vscode.window.showInputBox({ prompt: 'Introduce call data' })
        .then(val => {
            data = val;
            if (data) {
                command += `--data '${data}'`;
            }
            child_process.exec(command, (err, stdout) => {
                if (err) {
                    vscode.window.showErrorMessage(stdout);
                    return;
                }
                if (!logChannels[funcName]) {
                    logChannels[funcName] = vscode.window.createOutputChannel(funcName);
                }
                logChannels[funcName].show();
                logChannels[funcName].append(stdout);
            });
        });
}

function getLogs(funcName: string) {
    // TODO: Make call to Kubernetes API instead
    child_process.exec(`kubeless function logs ${funcName} `, (err, stdout) => {
        if (err) {
            vscode.window.showErrorMessage(stdout);
            return;
        }
        // TODO: Follow logs in output channel
        if (!logChannels[`${funcName}-logs`]) {
            logChannels[`${funcName}-logs`] = vscode.window.createOutputChannel(funcName);
        } else {
            logChannels[`${funcName}-logs`].clear();
        }
        logChannels[`${funcName}-logs`].show();
        logChannels[`${funcName}-logs`].append(stdout);
    });
}

function deleteFunction(funcName: string) {
    // TODO: Make call to Kubernetes API instead
    child_process.exec(`kubeless function delete ${funcName} `, (err, stdout) => {
        if (err) {
            vscode.window.showErrorMessage(stdout);
            return;
        }
        vscode.window.showInformationMessage(`Function ${funcName} successfully deleted`);
    });
}

function registerFunctions(context: vscode.ExtensionContext, doc: vscode.TextDocument, funcName: string, func: func) {
}

export function activate(context: vscode.ExtensionContext) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No editor found');
        return;
    }
    const doc = editor.document;
    return new Promise(resolve => {
        getFunction(doc.fileName, doc.getText(), doc.languageId).then((f: func) => {
            // Deploy
            context.subscriptions.push(vscode.commands.registerCommand('extension.deployFunction', () => {
                deploy(f);
            }));

            // Invoke
            context.subscriptions.push(vscode.commands.registerCommand('extension.callFunction', () => {
                call(f.id);
            }));

            // Logs
            context.subscriptions.push(vscode.commands.registerCommand('extension.getFunctionLogs', () => {
                getLogs(f.id);
            }));

            // Update
            context.subscriptions.push(vscode.commands.registerCommand('extension.updateFunction', () => {
                update(f);
            }));

            // Delete
            context.subscriptions.push(vscode.commands.registerCommand('extension.deleteFunction', () => {
                deleteFunction(f.id);
            }));
            resolve();
        });
    });
}

// this method is called when your extension is deactivated
export function deactivate() {
}