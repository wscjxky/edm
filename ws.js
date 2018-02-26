var WebSocketServer = require('ws').Server,
    wss = new WebSocketServer({ port: 8080 });
wss.on('connection', function (ws) {
    console.log('client connected');
    ws.on('message', function (message) {
        console.log(message);
    });
});
if ('0' == 0){
    console.log(5)
}
