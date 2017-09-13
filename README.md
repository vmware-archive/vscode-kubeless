# VSCode extension for Kubeless

[![VSCode Extension for Kubeless](./VSCode-Kubeless.gif)](https://youtu.be/t9Fn04pCXv4)

This extension is under heavy development so it is subject to change at any time.

## Requirements

 - Kubeless. [Installation Instructions](https://github.com/kubeless/kubeless#installation)
 - (Temporary) TypeScript. [Installation Instructions](https://www.typescriptlang.org/index.html#download-links)

## Installation

For the moment the plugin is not plubished yet. For installing it clone it in the extensions folder:
```console
$ git clone https://github.com/kubeless/vscode-kubeless $HOME/.vscode/extensions/vscode-kubeless
$ cd $HOME/.vscode/extensions/vscode-kubeless
$ npm install
$ npm run compile
```

Then you can open VScode and execute the exported commands.

## Features

This plugin support several commands for interacting with Kubeless and Kubernetes. For executing them open the Command Palette (⇧⌘P (Windows, Linux Ctrl+Shift+P)) and type:

* `Deploy Function`: Deploys the current file as a Kubeless function
* `Call Function`: Call the current function
* `Get Function Logs`: Display the logs of the current function
* `Delete Function`: Delete the current function
