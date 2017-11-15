var express = require('express');
var app = express();
var fs = require('fs');
var open = require('open');
var options = {
  key: fs.readFileSync('./fake-keys/privatekey.pem'),
  cert: fs.readFileSync('./fake-keys/certificate.pem')
};
var serverPort = (process.env.PORT  || 3000);
var https = require('https');
var http = require('http');
var server;
if (process.env.LOCAL) {
  server = https.createServer(options, app);
} else {
  server = http.createServer(app);
}
var io = require('socket.io')(server);

var roomList = {};

app.get('/', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/index.html');
});
server.listen(serverPort, function(){
  console.log('server up and running at %s port', serverPort);
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort)
  }
});

function socketIdsInRoom(name) {
  return roomList[name];
}

io.on('connection', function(socket){
  console.log('connection');
  socket.on('disconnect', function(){
    console.log('disconnect');
    if (socket.room) {
      var room = socket.room;
      io.to(room).emit('leave', socket.id);
      socket.leave(room);
    }
  });

  socket.on('join', function(name, callback){
    console.log('join', name);
    let room = roomList[name] || [];
    room.push(socket.id);
    roomList[name] = room;
    var socketIds = socketIdsInRoom(name);
    const obj = {
      mySocketId: socket.id,
      socketIds
    }
    callback(obj);
    socket.join(name);
    socket.room = name;
  });


  socket.on('exchange', function(data){
    data.from = socket.id;
    if(data.from === data.to) {
      console.log('data.from === data.to');
      return;
    }
    console.log('data.from', data.from);
    console.log('data.to', data.to);
    var to = io.sockets.connected[data.to];
    to.emit('exchange', data);
  });
});