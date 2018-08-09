import { app, BrowserWindow, ipcMain } from "electron"
import * as path from "path"
import { MouseEventType } from "./models";
import { Client } from "./client";

export default class RemoteWindow {
    private window!: BrowserWindow;
    private client: Client;

    public onClose: () => void = null;

    constructor(client: Client) {
        this.client = client;

        const startUrl = path.resolve('./content/remoteWindow.html');
        this.window = new BrowserWindow({ width: 1366, height: 768 });
        this.window.loadFile(startUrl);
        this.window.on("closed", this.handleClose);

        ipcMain.on("domReady", () => {
            console.log("Setitng window res");
            if (this.window)
                this.window.webContents.send("setResolution", { width: 1920, height: 1080 });
        });
        ipcMain.on("mouseEvent", this.handleMouseEvent);
    }

    private handleClose = () => {
        this.window = null;

        if (this.onClose)
            this.onClose();
    }

    private handleMouseEvent = (e, params: any) => {
        this.client.sendMouseEvent(params);
    }

    public drawFrame = (content: Buffer, frameData: any) => {
        if (this.window)
            this.window.webContents.send("drawFrame", { content, frameData });
    }

    public close() {
        if (this.window)
            this.window.close();
    }


}