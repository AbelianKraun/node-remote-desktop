import { app, BrowserWindow, ipcMain } from "electron"
import * as path from "path"
import fs from "fs-extra"
import { Client } from "./client";

// Capture device
let mainWindow: any = null;
let client = new Client();


// Create main window
app.on('ready', createWindow);

app.on("before-quit", () => {
    if (client)
        client.disconnect();
});

function createWindow() {
    const startUrl = path.resolve('./content/index.html');
    mainWindow = new BrowserWindow({ width: 800, height: 600 });
    mainWindow.loadFile(startUrl);
    mainWindow.on("closed", () => mainWindow = null);

}

// Client events
client.onReady = (id, pwd) => {
    if (mainWindow)
        mainWindow.webContents.send("clientReady", { id, pwd });
};

client.onFrameReceived = (content: Buffer, frameData: any) => {
    if (mainWindow)
        mainWindow.webContents.send("drawFrame", { content, frameData });
}

// DOM events
ipcMain.on("domReady", () => {
    client.connect();
})

ipcMain.on("connect", (e, { id, pwd }) => {
    console.log("Connecting to ", id, pwd);
    client.connectTo(id, pwd);
})