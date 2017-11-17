
const  express = require('express');
const  https = require('https');
const  http = require('http');
const  fs = require('fs');
const  open = require('open');
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

const serverPort = (process.env.PORT  || 3000);


let server;
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
app.get('/vonlutary', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/vonlutary.html');
});

app.get('/anonymous', function(req, res){
  console.log('get /');
  res.sendFile(__dirname + '/anonymous.html');
});

server.listen(serverPort, function(){
  console.log('server up and running at %s port', serverPort);
  if (process.env.LOCAL) {
    open('https://localhost:' + serverPort);
  }
});

// function socketIdsInRoom(name) {
//   var socketIds = io.nsps['/'].adapter.rooms[name];
//   if (socketIds) {
//     var collection = [];
//     for (var key in socketIds) {
//       collection.push(key);
//     }
//     return collection;
//   } else {
//     return [];
//   }
// }

io.on('connection', function(socket){
  socket.on('disconnect', function() {
    if (socket.type === 'anonymous') {
      firebase.database().ref('anonymousAvailable/' + socket.userId).remove();
    } else if (socket.type === 'vonlutary') {
      firebase.database().ref('vonlutaryAvailable/' + socket.userId).remove();
    }
    if(socket.otherId) {
      const to = io.sockets.connected[socket.otherId];
      to.emit('leave', socket.id);
    }
    if(socket.serviceId)
      firebase.database().ref('serviceInProgress/' + socket.serviceId).update({endTime: new Date().getTime()});
  });

  socket.on('join', function(userId, type, objData, callback){
    if(type === 'vonlutary') {
      configVoluntary(userId, objData, socket.id);
    }
    else if(type === 'anonymous') {
      configAnonymous(userId, objData, socket.id);
    }
    startASerice(userId, type, objData, socket.id, (obj) => {
      callback(obj);
      socket.userId = userId;
      if (type == 'anonymous') {
        socket.otherId = obj.vonlutary.socketId;
      } else if (type == 'vonlutary') {
        socket.otherId = obj.anonymous.socketId;
      }
      socket.serviceId = obj.serviceId;
      socket.type = type;
    });
  });


  socket.on('exchange', function(data){
    data.from = socket.id;
    var to = io.sockets.connected[data.to];
    to.emit('exchange', data);
  });
});

//essas funcões devem ser removidas em outros arquivos quando terminado

function configVoluntary(userId, objData, socketId){
  firebase.database().ref('vonlutaryAvailable').once('value').then((snapshot) => {
    const obj = snapshot.val() || {};
    
    obj[userId] = {
        voice: objData.voice,
        chat: objData.chat,
        video: objData.video,
        socketId,
        serviceId: false,
    };
    firebase.database().ref('vonlutaryAvailable').set(obj);
  });
}
function configAnonymous(userId, objData, socketId){
  firebase.database().ref('anonymousAvailable').once('value').then((snapshot) => {
    const obj = snapshot.val() || {};   
    obj[userId] = {
        connection: objData.connection,
        socketId,
        serviceId: false,
    };
    firebase.database().ref('anonymousAvailable').set(obj);
  });
}

function startASerice(userId, type, objData, socketId, callback) {
  if(type === 'vonlutary') {
    firebase.database().ref('vonlutaryAvailable/' + userId).once('value').then((snapshot) => {
      const objSave = snapshot.val() || {};
      if(objSave) {
        objSave.socketId = socketId;
        firebase.database().ref('vonlutaryAvailable/'+ snapshot.key).update(objSave);
      } 
      firebase.database().ref('anonymousAvailable').once('value').then((snapshot) => {
        let vonlutary, anonymous = null;
        snapshot.forEach(data => {
          const anonymousData = data.val();
          if(!anonymous && !anonymousData.serviceId) {
            if((anonymousData.connection == 'video' && objData.video) 
            || (anonymousData.connection == 'voice' && objData.voice)
            || (anonymousData.connection == 'chat' && objData.chat)) {
              anonymous = {
                userId: data.key,
                socketId: anonymousData.socketId
              };
            }
          }
        });
        vonlutary = {
          userId: userId,
          socketId: socketId
        };
        const objSave = {
          anonymous: anonymous ? anonymous : {},
          vonlutary: vonlutary ? vonlutary : {},
          startTime: new Date().getTime()
        };
        if(anonymous && vonlutary) {
          const serviceInProgress =  firebase.database().ref('serviceInProgress').push();
          serviceInProgress.set(objSave);
          objSave.serviceId = serviceInProgress.key;
          if(objSave.vonlutary.userId)
          firebase.database().ref('vonlutaryAvailable/' + objSave.vonlutary.userId).update({serviceId: serviceInProgress.key});
          if(objSave.anonymous.userId)
            firebase.database().ref('anonymousAvailable/' + objSave.anonymous.userId).update({serviceId: serviceInProgress.key});
        }
        callback(objSave);
      });
    });
  }
  else if(type === 'anonymous') {
    firebase.database().ref('vonlutaryAvailable').once('value').then((snapshot) => {
      let vonlutary, anonymous = null;
      snapshot.forEach(data => {
        const volutaryData = data.val();
        if(!vonlutary && !volutaryData.serviceId) {
          if((objData.connection == 'video' && volutaryData.video) 
          || (objData.connection == 'voice' && volutaryData.voice)
          || (objData.connection == 'chat' && volutaryData.chat)) {
            vonlutary = {
              userId: data.key,
              socketId: volutaryData.socketId
            };
          }
        }
      });
      anonymous = {
        userId: userId,
        socketId: socketId
      };
      const objSave = {
        anonymous,
        vonlutary: vonlutary ? vonlutary : {},
        startTime: new Date().getTime()
      };
      if(anonymous && vonlutary) {
        const serviceInProgress =  firebase.database().ref('serviceInProgress').push();
        serviceInProgress.set(objSave);
        objSave.serviceId = serviceInProgress.key;
        if(objSave.vonlutary.userId)
        firebase.database().ref('vonlutaryAvailable/' + objSave.vonlutary.userId).update({serviceId: serviceInProgress.key});
        if(objSave.anonymous.userId)
          firebase.database().ref('anonymousAvailable/' + objSave.anonymous.userId).update({serviceId: serviceInProgress.key});
      }
      callback(objSave);
    }); 
  }
}