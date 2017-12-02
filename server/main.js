
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const open = require('open');
const app = express();
const options = {
  key: fs.readFileSync('./fake-keys/privatekey.pem'),
  cert: fs.readFileSync('./fake-keys/certificate.pem')
};

const serverPort = (process.env.PORT || 3000);
let server;
if (process.env.LOCAL) {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}

const { createSocket } = require('./webrtc');
const { createRouter } = require('./router');
createSocket(server);
createRouter(app);
server.listen(serverPort, function () {
  console.log('server up and running at %s port', serverPort);
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort);
  }
});