var serveIndex = require('./.');
var assert = require('assert');
var express = require('express');
var http = require('http');
var fs = require('fs');

var integrationTests = [

    () => {
        var serve = serveIndex({baseDir : 'D:/public'});
        serve('/install/vs', '/testUrl', (error, data) => {
           assert.equal(error, null);
        });

        serve('/proxy.pac', '/testUrl', (error, data) => {
            assert.equal(error.status, 404);
        });

        serve('/Dproxy.pac', '/testUrl', (error, data) => {
            assert.equal(error.status, 404);
        });
    },

    () => {
        var serve = serveIndex({baseDir : 'D:/'});
        serve('/', '/testUrl', (error, data) => {
            assert.equal(error.status, 500); // system volume information rights
        });
    },

    () => {
        var serve = serveIndex({baseDir : 'D:\\public'});
        serve('/..', '/testUrl', (error, data) => {
            assert.equal(error.status, 500);
        });
    },

    () => {
        var serve = serveIndex({baseDir : 'D:\\public'});
        serve('/', '/testUrl', (error, data) => {
            assert.equal(error, null);
        });
    }
];

//integrationTests.forEach( (f) => f() );

var completeTest = function(){
    var app = express();
    var serve = serveIndex(
        {
            baseDir : 'D:/public'
       //     , filter : (file) => { file.name = "olol__" + file.name; return true; }
            , showHidden : true
       //     , injectJS : "alert('Hello!');"
            , injectTableHead : 'ololo'

        });
    app.use('/', serve);
    app.listen(3000);
};

//completeTest2();

 function completeTest2(){

    var serve = serveIndex(
        {
            baseDir : 'D:/public'
            //     , filter : (file) => { file.name = "olol__" + file.name; return true; }
            , showHidden : true
        });


    http.createServer(function (req, res) {
        serve(req.url, "/", function(err, data){
            res.end(data);
        });
    }).listen(3000);

}
