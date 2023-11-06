import WebSocket from "ws";

async function main(){
    const websocket = new WebSocket("ws://localhost:3000/.notifications/WebSocketChannel2023/d77aa5ea-9aeb-464b-b80f-add705fa7831");
    websocket.on("open", () => {
        console.log("open");
    });
    websocket.on("message", (data) => {
        console.log("message", data.toString());
    });
    websocket.on("close", () => {
        console.log("close");
    });
}

main();