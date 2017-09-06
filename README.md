# VSCode extension for Kubeless

This extension is under heavy development so it is subject to change at any time.

## Requirements

 - Kubeless. [Installation Instructions](https://github.com/kubeless/kubeless#installation)
 - (Temporary) TypeScript. [Installation Instructions](https://www.typescriptlang.org/index.html#download-links)

## Installation

For the moment the plugin is not plubished yet. For installing it clone it in the extensions folder:
```console
$ git clone https://github.com/andresmgot/vscode-kubeless $HOME/.vscode/extensions/vscode-kubeless
$ cd $HOME/.vscode/extensions
$ npm install
$ npm run compile
```

Then you can open VScode and execute the exported commands.

## Features

This plugin support several commands for interacting with Kubeless and Kubernetes:

* `Deploy Function`: Deploys the current file as a Kubeless function
* `Call Function`: Call the current function
* `Get Function Logs`: Display the logs of the current function
* `Update Function`: Update the deployed function with the current code
* `Delete Function`: Delete the current function

## Known Issues

Check `TODO` comments in the code.
