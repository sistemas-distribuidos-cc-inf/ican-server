//definition of the variables used
const 
    express = require('express'),
    app = express(),
    https = require('https'),
    http = require('http'),
    options = {},
    serverPort = 4443,
    server = https.createServer(options, app),
    io = require('socket.io')(server);


//server listening on port 4443
server.listen(serverPort, function(){
    console.log('server up and running at %s port', serverPort);
});
//open room listing
let openRoomListing = {};


// app.get('/', function(req, res){
//   console.log('get /');
//   res.sendFile(__dirname + '/index.html');
// });

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

//client connects to the server
io.on('connection', (socket) => {
  console.log('connection');
  socket.on('disconnect', () => {
    console.log('disconnect');
    if (socket.room) {
      var room = socket.room;
      io.to(room).emit('leave', socket.id);
      socket.leave(room);
    }
  });

  socket.on('join', (name, callback) => {
    console.log('join', name);
    var socketIds = socketIdsInRoom(name);
    if(callback === 'function')
        callback(socketIds);
    socket.join(name);
    socket.room = name;
  });


  socket.on('exchange', (data) => {
    console.log('exchange', data);
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('exchange', data);
  });
});