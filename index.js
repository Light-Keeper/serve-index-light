'use strict';

var fs = require('fs');
var posix_path = require('path').posix;
var ejs = require('ejs');
var folderStat = require('folder-stat');
var Mode = require('stat-mode');
var fileSize = require('filesize');

var defaultParams = {
    baseDir                 : null
  , fileListProvider        : defaultFileListProvider
  , filter                  : defaultFilter
  , comparator              : defaultComparator
  , showHidden              : false
  , render                  : defaultRender
  , templateProcessor       : defaultTemplateProcessor
  , rowTemplateProcessor    : defaultRowTemplateProcessor
  , template                : fs.readFileSync(posix_path.join(__dirname, 'defaults/template.ejs')     , 'utf8')
  , rowTemplate             : fs.readFileSync(posix_path.join(__dirname, 'defaults/row-template.ejs') , 'utf8')
  , injectTableHead         : fs.readFileSync(posix_path.join(__dirname, 'defaults/table-head.html')  , 'utf8')
  , injectCSS               : fs.readFileSync(posix_path.join(__dirname, 'defaults/style.css')        , 'utf8')
  , injectJS                : ""
  , injectHead              : ""
  , injectBody              : ""
  , middlewareResultHandler : defaultMiddlewareResultHandler
  , scanConcurrency         : 10
};

module.exports = function ServeIndexLight( user_params ){

    var params = Object.assign({}, defaultParams, user_params);
    if (!params.baseDir) throw new TypeError('params.baseDir required');

    // entry point for incoming request
    function executeQuery(path, baseUrl, callback){
        path = decodeURI(path);
        var realPath = posix_path.normalize(params.baseDir + path);
        if (realPath.length < params.baseDir.length) {
            return callback(createError(500, "invalid path"), "");
        }

        params.fileListProvider(realPath, function fileListProviderCallback(error, files){
            if (error) callback(error, "");
            else {
                var filteredFiles = files.filter( params.filter, params );
                filteredFiles.sort(  params.comparator.bind(params) );
                params.render(path, baseUrl, filteredFiles, callback);
            }
        });
    }

    // middleware for express
    function middlewareWrapper(req, res, next){
        executeQuery(req.path, req.baseUrl, function middlewareWrapperCallback(error, data){
            params.middlewareResultHandler(error, data, req, res, next);
        });
    }

    function executeSplitter(arg1, arg2, callback) {
        if (typeof arg1 === 'string') executeQuery(arg1, arg2, callback);
        else middlewareWrapper(arg1, arg2, callback)
    }

    return executeSplitter;
};

function createError(code, message) {
    return {
        status : code,
        message : message
    };
}

function defaultFileListProvider(path, callback){
    folderStat(path, function folderStatCallback(err, stats, files) {
        if (err) {
           return callback(createError(err.code == "ENOENT" || err.code == "ENOTDIR" ? 404 : 500, err.message));
        }
        stats.forEach(function(x, i) {x.name = files[i]; } );
        callback(null, stats);

     }, this.scanConcurrency);
}

function defaultFilter(fileInfo){
   return this.showHidden || fileInfo.name[0] != '.';
}

function defaultRender(path, baseUrl, files, callback){

    var preparedFiles = files.map( function(x){
        var m = new Mode(x);
        x.strAtime = x.atime.toLocaleString();
        x.strMtime = x.mtime.toLocaleString();
        x.strCtime = x.ctime.toLocaleString();
        x.strBirthtime = x.birthtime.toLocaleString();
        x.strMode = m.toString();
        x.baseUrl = baseUrl;
        x.path = path;
        x.href = posix_path.normalize(baseUrl + '/' + path + '/' + x.name);
        x.size = x.isDirectory() ? "" : x.size;
        x.sizeHumanReadable = x.isDirectory() ? "" : fileSize(x.size);
        x.isDir = x.isDirectory();
        return x;
    } ).map(this.rowTemplateProcessor, this);

    var initPathComponents = [];
    if (baseUrl.length > 1) {
        initPathComponents.push({
            href : posix_path.normalize(posix_path.dirname(baseUrl)),
            name : '~'
        });

        initPathComponents.push({
            href : posix_path.normalize(baseUrl),
            name : posix_path.basename(baseUrl)
        });
    } else {
        initPathComponents.push({
            href : '/',
            name : '~'
        });
    }

    var pathComponents = path.split('/')
        .filter(function(x){return x})
        .reduce(function(arr, x){
            arr.push({
                name : x,
                href : posix_path.normalize(arr[arr.length - 1].href + '/' + x)
            });
            return arr;
        }, initPathComponents );

    var renderData = {
        path            : path
      , pathComponents  : pathComponents
      , baseUrl         : baseUrl
      , upPath          : posix_path.dirname(path)
      , files           : preparedFiles
      , showUp          : path != '/'
      , options         : this
    };

    var res = this.templateProcessor(renderData);
    callback(null, res);
}

function defaultTemplateProcessor( renderData ){
    if (!this.templateCompiled) {
        this.templateCompiled = ejs.compile(this.template);
    }
    return this.templateCompiled(renderData);
}

function defaultRowTemplateProcessor(fileInfo){
    if (!this.rowTemplateCompiled) {
        this.rowTemplateCompiled = ejs.compile(this.rowTemplate);
    }
    return this.rowTemplateCompiled(fileInfo);
}

function defaultMiddlewareResultHandler( error, data, req, res, next ){
    if (!error) return res.end(data);
    if (error.status == 404) return next();
    return next(error);
}

function defaultComparator(a, b){
    // sort ".." to the top
    if (a.name === '..' || b.name === '..') {
        return    a.name === b.name ? 0
                : a.name === '..' ? -1 : 1;
    }

    return Number(b.isDirectory()) - Number(a.isDirectory()) ||
        a.name.toLocaleLowerCase().localeCompare(b.name.toLocaleLowerCase());
}
