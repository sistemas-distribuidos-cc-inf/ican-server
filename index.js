
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const open = require('open');
const firebase = require('firebase-admin');

let serviceAccount = require('./serviceAccountFirebaseAdmin.json');

firebase.initializeApp({
  credential: firebase.credential.cert(serviceAccount),
  databaseURL: 'https://ican-app.firebaseio.com'
});
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
const io = require('socket.io')(server, { pingTimeout: 30000 });
const rand = require('generate-key');

const roomList = {};
app.get('/', function (req, res) {
  console.log('get /');
  res.sendFile(__dirname + '/index.html');
});


app.get('/vonlutary', function (req, res) {
  console.log('get /vonlutary');
  res.sendFile(__dirname + '/vonlutary.html');
});

app.get('/anonymous', function (req, res) {
  console.log('get /anonymous');
  res.sendFile(__dirname + '/anonymous.html');
});
server.listen(serverPort, function () {
  console.log('server up and running at %s port', serverPort);
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort)
  }
});

function socketIdsInRoom(name) {
  var socketIds = io.nsps['/'].adapter.rooms[name];
  if (socketIds) {
    var collection = [];
    for (var key in socketIds) {
      collection.push(key);
    }
    return collection;
  } else {
    return [];
  }
}

io.on('connection', function (socket) {
  console.log('connection');
  socket.on('disconnect', function () {
    console.log('disconnect');
    const room = socket.room;
    if (!room) return;
    if (socket.type_user == 'vonlutary') {
      delete roomList[socket.room];
    } else if (socket.type_user == 'anonymous') {
      roomList[room].anonymousId = null;
      roomList[room].available = true;

    }
    io.to(room).emit('leave', socket.id);
    socket.leave(room);
  });

  socket.on('join', function (type, callback) {
    if (type == 'vonlutary') {
      let room = null;
      Object.keys(roomList).filter(r => {
        if (roomList[r].available) room = r;
      });
      if (!room) {
        const roomRandom = rand.generateKey();
        roomList[roomRandom] = {
          vonlutaryId: socket.id,
          available: true
        };
        socket.type_user = type;
        socket.room = roomRandom;
        socket.join(roomRandom);
        callback(null);
      }
      else if (room) {
        roomList[room].vonlutaryId = socket.id;
        roomList[room].available = false;
        socket.room = room;
        socket.join(room);
        callback(roomList[room].anonymousId);
      }
      else {
        callback(null);
      }
    } else if (type == 'anonymous') {
      let room = null;
      Object.keys(roomList).forEach(r => {
        if (roomList[r].available) room = r;
      });
      if (room) {
        socket.type_user = type;
        roomList[room].anonymousId = socket.id;
        roomList[room].available = false;
        socket.room = room;
        socket.join(room);
        callback(roomList[room].vonlutaryId);
      } else {
        const roomRandom = rand.generateKey();
        roomList[roomRandom] = {
          anonymousId: socket.id,
          available: true
        };
        socket.type_user = type;
        socket.room = roomRandom;
        socket.join(roomRandom);
        callback(null);
      }
    }
  });


  socket.on('exchange', function (data) {
    console.log('exchange', data);
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('exchange', data);
  });
});