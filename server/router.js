const {
    vonlutary
} = require('./mongodb');

function createRouter(app) {
    app.get('/', function (req, res) {
        console.log('get /');
        res.sendFile(__dirname + '/view/index.html');
      });
    app.get('/vonlutary', function (req, res) {
        console.log('get /vonlutary');
        res.sendFile(__dirname + '/view/vonlutary.html');
      });
    app.get('/anonymous', function(req, res){
        console.log('get /anonymous');
        res.sendFile(__dirname + '/view/anonymous.html');
    });
    app.get('/login', function(req, res){
        console.log('get /login');
        res.sendFile(__dirname + '/view/login.html');
      });
    app.post('/userlogin', function(req, res){
        console.log(req);
        const query = req.query || {};
        const email = query.email || null;
        const password = query.password || null;
        vonlutary.find(email, password, (err, userId) => {
            res.json(
                {
                    err,
                    userId
                }
            );

        });
    });
}

module.exports = {
    createRouter: createRouter
};