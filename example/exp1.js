var serveIndex = require('./..');
var express = require('express');

function getFileServer(dir) {
    var server = express.Router();
    server.use(express.static(dir));
    server.use(serveIndex({baseDir : dir}));
    server.use(function(req, res){
        res.status(404).end();
    });
    return server;
}

var app = express();

app.use('/shared', getFileServer('D:/public'));
app.listen(3000);
