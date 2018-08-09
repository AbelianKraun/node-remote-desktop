
export enum ClientStatus {
    Disconnected,
    Connected,
    Ready,
}


export enum MessageType {
    ClientReady,

    ConnectionRequest,
    ConnectionAccept,
    ConnectionCompleted,
    ConnectionClose,
    ConnectionClosed,

    MouseEvent,

    NextFrameData,
    FrameRequest,

    Success,
    Error,
}

export enum MouseEventType {
    MouseMove,
    MouseDown,
    MouseUp,
    MouseWheel
}

export class FrameData {
    constructor(public x: number, public y: number, public width: number, public height: number) {}
}