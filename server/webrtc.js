function createSocket(server) {
    const rand = require('generate-key');
    const io = require('socket.io')(server, { pingTimeout: 30000 });
    const roomList = {};
    io.on('connection', function(socket){
        socket.on('disconnect', function(){
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
}

module.exports.createSocket = createSocket;