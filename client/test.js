const { app, BrowserWindow, ipcMain } = require('electron')
const path = require("path");
const fs = require("fs-extra");
const captureModule = require('./bindings');
const WebSocketClient = require('websocket').client;
const PNG = require("node-png").PNG;
const streamToBuffer = require("stream-to-buffer");
const screenCapturer = new captureModule.Vector();
let win;

// Init capturer
let init = screenCapturer.initDevice();

// On fail close app
if (!init) {
    app.quit();
    return;
}

let i = 0;

function getScreen() {
    console.log("getting screen");

    let d = screenCapturer.getNextFrame((d) => {
        console.log(d);
        fs.writeFileSync("outclient" + i + ".png", Buffer.from(new Uint8Array(d.data)));
        i++;

        setTimeout(() => getScreen(), 1000);
    });


}

//getScreen();
setTimeout(() => screenCapturer.mouseClick(), 5000);


function exitHandler(options, err) {

    if (screenCapturer)
        screenCapturer.releaseDevice();

    if (err) console.log(err.stack);
    if (options.exit) process.exit();
}

//do something when app is closing
process.on('exit', exitHandler.bind(null, { cleanup: true }));

//catches ctrl+c event
process.on('SIGINT', exitHandler.bind(null, { exit: true }));

// catches "kill pid" (for example: nodemon restart)
process.on('SIGUSR1', exitHandler.bind(null, { exit: true }));
process.on('SIGUSR2', exitHandler.bind(null, { exit: true }));

//catches uncaught exceptions
process.on('uncaughtException', exitHandler.bind(null, { exit: true }));