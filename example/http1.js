var serveIndex = require('./..');
var http = require('http');

var serve = serveIndex(
    {
          baseDir : 'D:/public'
        , showHidden : true
        , rowTemplateProcessor : function( file ) {
                return file;
            }
        , templateProcessor : function(data) {
                    return JSON.stringify(data, null, 2);
            }
    });


http.createServer(function (req, res) {
    serve(req.url, "/", function(err, data){
        res.end(data);
    });
}).listen(3000);