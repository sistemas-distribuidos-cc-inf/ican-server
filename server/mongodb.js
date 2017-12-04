
const mongoose = require('mongoose');
let vonlutaryCollection, onlineUser, anonymousCollection, roomCollection;
function createConnectionMongo() { 
    mongoose.connect('mongodb://admin:icanadminuser@ds129066.mlab.com:29066/ican');
    const db = mongoose.connection;
    db.on('error', () => {
        console.log('connection error:');
    });
    db.once('open', () => {
        createSchemas();
    });
}
function createSchemas() {
    const vonlutarySchema = mongoose.Schema({
        email: String,
        password: String
    });
    vonlutaryCollection = mongoose.model('vonlutary', vonlutarySchema);
    const anonymousSchema = mongoose.Schema({
        nick: String,
    });
    anonymousCollection = mongoose.model('anonymous', anonymousSchema);
    const onlineUserSchema = mongoose.Schema({
        userId: String,
        socketId: String,
        type: String,
        available: Boolean
    });
    onlineUser = mongoose.model('onlineUser', onlineUserSchema);
    const roomSchema = mongoose.Schema({
        vonlutaryId: String,
        vonlutarySocketId: String,
        anonymousId: String,
        anonymousSocketId: String,
        available: Boolean
    });
    roomCollection = mongoose.model('room', roomSchema);
}


const vonlutary = {
    create(email, password, callback) {
        const vonlutary = new vonlutaryCollection({ email, password });
        vonlutary.save(function (err, vonlutary) {
            if (err) return callback(err);
            const _id = (vonlutary && vonlutary._id && vonlutary._id.toString()) || null; 
            callback(null, _id);
        });
    },
    find(email, password, callback) {
        vonlutaryCollection.find(
            {email, password},
            function (err, users) {
            if (err) return callback(err);
            const _id = (users[0] && users[0]._id && users[0]._id.toString()) || null; 
            callback(null, _id);
        });
    },
    findByEmail(email, callback) {
        vonlutaryCollection.find(
            {email},
            function (err, users) {
            if (err) return callback(err);
            const _id = (users[0] && users[0]._id && users[0]._id.toString()) || null; 
            callback(null, _id);
        });
    }
};
const anonymous = {
    create(nick, callback) {
        const anonymous = new anonymousCollection({ nick });
        anonymous.save(function (err, anonymous) {
            if (err) return callback(err);
            const _id = (anonymous && anonymous._id && anonymous._id.toString()) || null; 
            callback(null, _id);
        });
    },
    find(nick, callback) {
        anonymousCollection.find(
            {nick},
            function (err, users) {
            if (err) return callback(err);
            const _id = (users[0] && users[0]._id && users[0]._id.toString()) || null; 
            callback(null, _id);
        });
    },
    detele(userId, callback) {
        anonymousCollection.remove({_id: userId}, 
        (err) => {
            callback(err);
        });
    }
};

const online = {
    create(userId, socketId, type, callback) {
        const online = new onlineUser(
            { 
                userId, 
                socketId,
                type, 
                available: true 
            }
        );
        online.save(function (err, online) {
            if (err) return callback(err);
            const _id = (online && online._id && online._id.toString()) || null; 
            callback(null, _id);
        });
    },
    findUserId(userId, type, callback) {
        onlineUser.find({
				userId,
				type
            },
            (err, user) => {
                if (err) return callback(err);
                callback(null, user[0]);
            }
        );
    },
    createVonlutaryOnline(userId, socketId, callback) {
        online.findUserId(userId, 'vonlutary',
            (err, user) => {
                if(!user) {
                    online.create(
                        userId,
                        socketId,
                        'vonlutary',
                        (err, id) => callback(err, id)
                    );
                } else {
                    const _id = (user._id && user._id.toString()) || null; 
                    callback(null, _id);
                }
            }
        );
    },
    createAnonymousOnline(userId, socketId, callback) {
        online.findUserId(userId, 'anonymous',
            (err, user) => {
                if(!user) {
                    online.create(
                        userId,
                        socketId,
                        'anonymous',
                        (err, id) => callback(err, id)
                    );
                } else {
                    const _id = (user._id && user._id.toString()) || null; 
                    callback(null, _id);
                }
                
            }
        );
    },
    delete(userId, callback) {
        onlineUser.remove({userId}, 
        (err) => {
            if(err) return callback(err);
            callback();
        });
    }
};

const room = {
	create(data, callback) {
        let r;
		if(data.type == 'vonlutary') {
			online.findUserId(data.userId, 'vonlutary', 
			(err, user) => {
				if(user) {
					r = {
						vonlutaryId: data.userId,
						vonlutarySocketId: user.socketId,
						available: true
                    };
                    roomCollection.findOneAndUpdate({vonlutaryId: data.userId}, r, {upsert:true}, 
                        (err, online) => {
                        if (err) return callback(err);
                        const _id = (online && online._id && online._id.toString()) || null; 
                        callback(null, _id);
                    });
				}
			});
		} else if(data.type == 'anonymous') {
			online.findUserId(data.userId, 'anonymous', 
			(err, user) => {
				if(user) {
					r = {
						anonymousId: data.userId,
						anonymousSocketId: user.socketId,
						available: true
                    };
                    roomCollection.findOneAndUpdate({anonymousId: data.userId}, r, {upsert:true}, 
                        (err, online) => {
                        if (err) return callback(err);
                        const _id = (online && online._id && online._id.toString()) || null; 
                        callback(null, _id);
                    });
				}
			});
		}
	},
	searchForAvaiableRoom(callback) {
		roomCollection.find({
			available: true
		},  (err, room) => {
            room = room || [];
			if (err) return callback(err);
			callback(null, room);
		});
	},
	roomAvailableToEnterVonlutary(room, callback) {
		const roomAvailable = room.filter(r => 
			!r.vonlutaryId && !r.vonlutarySocketId
		)[0];
		callback(roomAvailable);
	},
	roomAvailableToEnterAnonymous(room, callback) {
		const roomAvailable = room.filter(r => 
			!r.anonymousId && !r.anonymousSocketId
		)[0];
		callback(roomAvailable);
	},
	putTheRoomInoccupied(_id, type, userId, callback) {
		online.findUserId(userId, type, (err, user) => {
			let update = {};
			if(type === 'vonlutary') {
				update = {
					$set: {
						vonlutaryId: userId,
						vonlutarySocketId: user.socketId,
						available: false
					}
				};
			} else if(type === 'anonymous') {
				update = {
					$set: {
						anonymousId: userId,
						anonymousSocketIdSocketId: user.socketId,
						available: false
					}
				};
            }
            const query = {
                _id: _id
            };
			roomCollection.findOneAndUpdate(query, update, { upsert: true }, (err, room) => {
                if(err) callback(err);
                callback(null, room);
            });
		});
	},
	join(userId, type, callback) {
		room.searchForAvaiableRoom((err, r) => {
            r = r || [];
			if(type === 'vonlutary') {
				room.roomAvailableToEnterVonlutary(r, 
					(re) => {
                        if(!re) {
                            room.create({
                                type,
                                userId, 
                            }, (errm, roomId)=> {
                                callback(null, roomId, null);   
                            });
                        } else {
                            room.putTheRoomInoccupied(re._id.toString(), type, userId, 
                            (err) => {  
                                const anonymousSocketId = re.anonymousSocketId;
                                callback(err, re._id.toString(), anonymousSocketId);
                            });
                        }
					});
			} else if(type === 'anonymous') {
				room.roomAvailableToEnterAnonymous(r, 
					(re) => {
                        if(!re) {
                            room.create({
                                type,
                                userId, 
                            }, (errm, roomId)=> {
                                callback(null, roomId, null);   
                            });                     
                        } else {
                            room.putTheRoomInoccupied(re._id.toString(), type, userId, 
                            (err) => {
                                const vonlutarySocketId = re.vonlutarySocketId;
                                callback(err, re._id.toString(), vonlutarySocketId);
                            });
                        }
					});
			}
		});
    },
    searchForAUserInARoom(roomId, callback) {
        let find = {
            _id: roomId
        };
        roomCollection.find(find, (err, room) => {
            if(err) return callback(err);
            callback(err, room[0]);
        });
    },
    removeUserFromRoom(roomId, type, callback) {
        let update = {};
        if(type == 'vonlutary') {
            update = {
                vonlutarySocketId: null,
                vonlutaryId: null,
                available: true
            };
        }
        else if(type == 'anonymous') {
            update = {
                anonymousSocketId: null,
                anonymousId: null,
                available: true
            };
        }
        const query = {
            _id: roomId
        };
        roomCollection.findOneAndUpdate(query, update, { upsert: true }, (err, r) => {
            if(err) callback(err);
            room.deleteRoomWithoutUsers(r, type, callback);
        });
    },
    deleteRoomWithoutUsers(r, type, callback) {
        if((type== 'vonlutary' && !r.anonymousId && !r.anonymousSocketId)
        || (type== 'anonymous' && !r.vonlutaryId && !r.vonlutarySocketId)
    ) {
        roomCollection.remove({_id: r._id.toString()}, 
        (err) => {
            callback(err, r);                
        });
    } else {
            callback(null, r);
        }         
            
    },
    leave(roomId, type, callback) {
        room.searchForAUserInARoom(roomId, 
            (err, r) => {
                if(err) return callback(err);
                const userId = type == 'vonlutary' ? r.vonlutaryId : r.anonymousId;
                // if(type == 'anonymous')
                //     anonymous.detele(userId, call);
                // else call();
                // function call(err) {
                    online.delete(userId, () => {
                        room.removeUserFromRoom(roomId, type, (err) => {
                            callback(err);
                        });
                    });
                // }
            });

    },
};


module.exports = {
    createConnectionMongo,
    vonlutary,
	online,
    anonymous,
    room
};

