﻿import { app, BrowserWindow, ipcMain } from "electron"
import * as path from "path"
import fs from "fs-extra"
import captureModule from "./bindings"
import { Client } from "./client";

// Capture device
let screenCapturer = new captureModule.Vector();
let mainWindow: any = null;
let client = new Client();

// Init device
if (!screenCapturer.initDevice()) {
    console.log("Init device failed.");
    app.quit();
}

// Create main window
app.on('ready', createWindow);

app.on("before-quit", () => {
    if (screenCapturer)
        screenCapturer.releaseDevice();
});

function createWindow() {
    const startUrl = path.resolve('./content/index.html');
    mainWindow = new BrowserWindow({ width: 800, height: 600 });
    mainWindow.loadFile(startUrl);
    mainWindow.on("closed", () => mainWindow = null);

    // Start client
    client.connect();
}