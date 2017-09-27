'use strict';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as child_process from 'child_process';
import * as fs from 'fs';
import * as request from 'request';
import * as path from 'path';
import * as os from 'os';
import * as _ from 'lodash';
import * as call from 'serverless-kubeless/lib/invoke';
import * as remove from 'serverless-kubeless/lib/remove';
import * as deploy from 'serverless-kubeless/lib/deploy';
import * as getLogs from 'serverless-kubeless/lib/get-logs';
import * as helpers from 'serverless-kubeless/lib/helpers';

interface func {
    id: string,
    handler: string,
    deps: string,
    text: string,
    namespace?: string,
    events: Array<{
        type: string,
        trigger?: string,
        path?: string,
        hostname?: string,
    }>,
    fileName: string,
    runtime: string,
    environment?: {},
    memorySize?: string,
}

const logChannels = {};

function exportFunctionDef(f: func) {
    const vscodeSettingsPath = path.join(vscode.workspace.rootPath, '.vscode');
    if (!fs.existsSync(vscodeSettingsPath)) {
        fs.mkdirSync(vscodeSettingsPath);
    }
    const funcsPath = path.join(vscodeSettingsPath, 'funcs.json');
    let funcs = [];
    if (fs.existsSync(funcsPath)) {
        funcs = JSON.parse(fs.readFileSync(funcsPath, 'utf-8'));
    }
    const previousFunc = _.findIndex(funcs, ff => ff.fileName === f.fileName);
    if (previousFunc >= 0) {
        funcs[previousFunc] = f;
    } else {
        funcs.push(f);
    }
    fs.writeFileSync(funcsPath, JSON.stringify(funcs, null, 2));
}

function importFunctionDef(fileName: string) {
    let result = null;
    const funcsPath = path.join(vscode.workspace.rootPath, '.vscode', 'funcs.json');
    if (fs.existsSync(funcsPath)) {
        const funcs = JSON.parse(fs.readFileSync(funcsPath, 'utf-8'));
        result = _.find(funcs, ff => ff.fileName === fileName) || null;
    }
    return result;
}

const consoleLog = console.log;
function redirectConsoleLog(channel: vscode.OutputChannel) {
    console.log = (buff) => channel.append(`${buff.toString()}\n`);
}

function restoreConsoleLog() {
    console.log = consoleLog;
}

async function getFunction() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showErrorMessage('No editor found');
        return;
    }
    const doc = editor.document;
    const runtime = doc.languageId === 'javascript' ? 'nodejs' : doc.languageId;
    const config = vscode.workspace.getConfiguration();
    const depsFile = helpers.getRuntimeFilenames(runtime, '').deps;
    const depsFilePath = path.join(path.dirname(doc.fileName), depsFile);
    const deps = fs.existsSync(depsFilePath) ? fs.readFileSync(depsFilePath, 'utf-8') : null;
    const text = doc.getText();
    let func = {
        id: null,
        handler: null,
        fileName: doc.fileName,
        runtime: null,
        deps,
        text,
        namespace: helpers.getDefaultNamespace(helpers.loadKubeConfig()),
        events: [{ type: 'http', path: '/' }],
        environment: {},
        memorySize: null,
    }
    return new Promise<func> ( async (resolve, reject) => {
        func = importFunctionDef(doc.fileName) || func;
        if (func.id) {
            // If the function is found update the current text
            _.assign(func, { text, deps })
            exportFunctionDef(func);
            resolve(func);
        } else {
            const handlerFile = path.basename(doc.fileName).split('.')[0];
            if (!func.runtime) {
                switch (runtime) {
                    case 'python':
                        func.runtime = 'python2.7';
                        break;
                    case 'nodejs':
                        func.runtime = 'nodejs6';
                        break;
                    case 'ruby':
                        func.runtime = 'ruby2.4';
                        break;
                    default:
                        vscode.window.showErrorMessage(`Language ${runtime} is not supported`);
                        throw new Error();
                }
            }
            const id = await vscode.window.showInputBox({ prompt: 'Which function do you want to work with? (It should match with a function exposed)' });
            if (id) {
                func.id = id;
                func.handler = func.handler || `${handlerFile}.${func.id}`;
                exportFunctionDef(func);
                resolve(func);
            } else {
                vscode.window.showErrorMessage('You should specify the function name')
                reject();
            }

        }
    });
}
 
async function deployFunction(f: func) {
    if (!logChannels[`${f.id}-deployment`]) {
        logChannels[`${f.id}-deployment`] = vscode.window.createOutputChannel(`${f.id}-deployment`);
    }
    logChannels[`${f.id}-deployment`].show();
    // Redirect console output to the user
    redirectConsoleLog(logChannels[`${f.id}-deployment`]);
    try {
        const res = await deploy([f], f.runtime, { verbose: true, force: true });
        vscode.window.showInformationMessage(`Deployment finished`);
        restoreConsoleLog();
    } catch (err) {
        vscode.window.showErrorMessage(`ERROR: ${err}`);
        restoreConsoleLog();
        throw new Error(err);
    }
}

async function callFunction(f: func) {
    const data = await vscode.window.showInputBox({ prompt: 'Introduce call data (or file containing the data)' });
    let response = null;
    if (!logChannels[f.id]) {
        logChannels[f.id] = vscode.window.createOutputChannel(f.id);
    }
    logChannels[f.id].show();
    logChannels[f.id].append(`Calling ${f.id}...\n`);
    try {
        if (data && fs.existsSync(data)) {
            // Path introduced
            response = await call(f.id, null, [f], { path: data });
        } else {
            response = await call(f.id, data, [f]);
        }
    } catch (err) {
        vscode.window.showErrorMessage(err.message);
        return;
    }
    if (!_.isEmpty(response.body)) {
        const responseAsString = _.isPlainObject(response.body) ?
            JSON.stringify(response.body, null, 2) :
            response.body;
        logChannels[f.id].append(`Response:\n${responseAsString}\n`);
    } else {
        // Received an empty response
        logChannels[f.id].append(`${f.id} succesfully invoked\n`);
    }
}

function getLogsFunction(f: func) {
    if (!logChannels[`${f.id}-logs`]) {
        logChannels[`${f.id}-logs`] = vscode.window.createOutputChannel(`${f.id}-logs`);
    } else {
        logChannels[`${f.id}-logs`].clear();
    }
    const p = getLogs(f.id, {
        namespace: f.namespace,
        tail: true,
        onData: (d) => {
            logChannels[`${f.id}-logs`].append(d.toString());
        }
    });
    p.catch((err: Error) => {
        vscode.window.showErrorMessage(err.message);
        return;
    })
    logChannels[`${f.id}-logs`].show();
}

async function deleteFunction(f: func) {
    try {
        if (!logChannels[`${f.id}-deployment`]) {
            logChannels[`${f.id}-deployment`] = vscode.window.createOutputChannel(`${f.id}-deployment`);
        }
        logChannels[`${f.id}-deployment`].show();
        // Redirect console output to the user
        redirectConsoleLog(logChannels[`${f.id}-deployment`]);
        await remove([f], f.runtime, { verbose: true, force: true })
        vscode.window.showInformationMessage(`${f.id} successfully deleted`);
        restoreConsoleLog();
    } catch(err) {
        vscode.window.showErrorMessage(`ERROR: ${err}`);
        restoreConsoleLog();
        throw new Error();
    }
}

export function activate(context: vscode.ExtensionContext) {

    // Deploy
    context.subscriptions.push(vscode.commands.registerCommand('extension.deployFunction', async () => {
        try {
            const f = await getFunction();
            deployFunction(f);
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    }));

    // Call
    context.subscriptions.push(vscode.commands.registerCommand('extension.callFunction', async () => {
        try {
            const f = await getFunction();
            callFunction(f);
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    }));

    // Logs
    context.subscriptions.push(vscode.commands.registerCommand('extension.getFunctionLogs', async () => {
        try {
            const f = await getFunction();
            getLogsFunction(f);
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    }));

    // Delete
    context.subscriptions.push(vscode.commands.registerCommand('extension.deleteFunction', async () => {
        try {
            const f = await getFunction();
            deleteFunction(f);
        } catch (e) {
            vscode.window.showErrorMessage(e.message);
        }
    }));
}
