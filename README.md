# VSCode extension for Kubeless

[<img src="https://raw.githubusercontent.com/kubeless/vscode-kubeless/master/VSCode-Kubeless.gif" width="600" align="center">](https://youtu.be/t9Fn04pCXv4)

This extension is under heavy development so it is subject to change at any time.

## Requirements

 - Kubeless. [Installation Instructions](https://github.com/kubeless/kubeless#installation)

## Installation

You can install this extension from the [marketplace](https://marketplace.visualstudio.com/items?itemName=bitnami.kubeless)

## Features

This plugin support several commands for interacting with Kubeless and Kubernetes. For executing them open the Command Palette (⇧⌘P (Windows, Linux Ctrl+Shift+P)) and type:

* `Deploy Function`: Deploys the current file as a Kubeless function
* `Call Function`: Call the current function
* `Get Function Logs`: Display the logs of the current function
* `Delete Function`: Delete the current function

## Configuring Function Properties

After executing one of the above command a file is created under `PROJECT_WORKSPACE/.vscode/funcs.json`. This file includes the properties of a function regarding a specific file. For example:
```json
[
  {
    "id": "hello",
    "handler": "handler.hello",
    "fileName": "/home/examples/get-python/handler.py",
    "runtime": "python2.7",
    "deps": null,
    "text": "def hello():\n    return \"hello world\"\n",
    "namespace": "default",
    "events": [
      {
        "type": "http",
        "path": "/",
        "hostname": null,
        "trigger": null
      }
    ],
    "environment": {},
    "memorySize": null
  }
]
```
You can modify some of these parameters to change the deployment of the function:
 - ID: Function ID
 - Handler: Identifies the function exported in the file. In this example we are exposing the function `hello` of the file `handler.py`.
 - Runtime: Runtime to use for running the function.
 - Deps: Dependencies of the function. This field is automatically refreshed each time a command is executed.
 - Text: Function text. This field is automatically refreshed each time a command is executed.
 - Namespace: Kubernetes namespace in which the function should be deployed.
 - Events: Events that should trigger the function execution.
   - Type: `http` or `trigger`. If `http` is chosen the code will be trigger with HTTP GET/POST calls. In the case of using `trigger` the function will be executed when some message is published under certain topic.
   - Hostname: (Only for `http` type) Hostname in which the function should be deployed.
   - Path: (Only for `http` type) Subpath in which the function should be deployed.
   - Trigger: (Only for `trigger` type) Trigger topic.
 - Environment: Key/Value for Environment variables that the function should have available.
 - Memory Size: Maximum memory size to use for the function. F.e. '128Mi'