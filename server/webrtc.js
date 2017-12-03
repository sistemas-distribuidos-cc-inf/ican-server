const {
 anonymous,
 online,
 vonlutary,
 room
} = require('./mongodb');
function createSocket(server) {
    const rand = require('generate-key');
    const io = require('socket.io')(server, { pingTimeout: 30000 });
    const roomList = {};
    io.on('connection', function(socket){
        socket.on('disconnect', function(){
            debugger
            console.log('disconnect');
            const roomId = socket.roomId;
            if (!roomId) return;
            room.leave(roomId, socket.type_user, () => {
                io.to(roomId).emit('leave', socket.id);
                socket.leave(roomId);
            });
        });
    
        socket.on('join', function (type, objData, callback) {
            socket.type_user = type;
            if (type == 'vonlutary') {
                vonlutary.findByEmail(objData.email, (err, userId) => {
                    if(err) callback(err);
                    online.createVonlutaryOnline(userId, socket.id, (err) => {
                        if(err) callback(err);
                        room.join(userId, type, (err, roomId, socketId) => {
                            socket.roomId = roomId;
                            socket.join(roomId);
                            callback(socketId);
                        });
                    });
                });
            } 
            else if (type == 'anonymous') {
                debugger
                anonymous.create(objData.nick, (err, userId) => {
                    if(err) callback(err);
                    online.createAnonymousOnline(userId, socket.id, (err) => {
                        if(err) callback(err);
                        room.join(userId, type, (err, roomId, socketId) => {
                            socket.roomId = roomId;
                            socket.join(roomId);
                            callback(socketId);
                        });
                    });
                });
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