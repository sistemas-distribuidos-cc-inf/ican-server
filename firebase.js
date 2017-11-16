var admin = require('firebase-admin');

let serviceAccount = require('./serviceAccountFirebaseAdmin.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://ican-app.firebaseio.com'
});

module.export = admin;
