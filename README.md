# serve-index-light
Serve directory listings, based on [expressjs/serve-index](https://github.com/expressjs/serve-index) UI and functionality.
Serves pages that contain directory listings for a given path. Can be used without express, as standalone library, provides a lot of customisation possibilities.

## Install

```sh
$ npm install --save serve-index-light
```

## API

```js
var serveIndex = require('serve-index-light')
```

### serveIndex(options)

Returns function that serves an index of the directory specified by options.

```js
var serveIndex = require('serve-index-light')
var http = require('http');
var express = require('express');

var servePublicIndex = serveIndex({ baseDir : "D:/public" })

// servePublicIndex could be used as as standalone serve function: 
 http.createServer(function (req, res) {
        servePublicIndex(req.url, "/", function(err, data){
            res.end(data);
        });
    }).listen(3000);

// or as express middleware: 
var app = express();
app.use('/shared', servePublicIndex);
app.listen(4000);
```

Stadalone mode : `servePublicIndex(path, basePath, callback)` where

* `path` - requested path
* `basePath` - path to preppend to each generated link. for example you serve `http://example.com/shared/` from `D:/public`, you should use `path = '/'` and `basePath = '/shared'`.
* `function callback(error, data)` - function will be called with `error` and `data`. `error` might be `null` or object like ` { status : 500, message : "invalid path"}`. `data` is html string by default.  


If requested path not found or it is not a directory, `error.code` is set to `404`. 

Express middleware mode: `servePublicIndex(req, res, next)`. uses `req.path` as path and `req.baseUrl` as base URL. 
in case of 404 error `next()` is called, in case of other error `next(error)` is called. if no error ` res.end(data)` is called. this behaviour could be changed by `middlewareResultHandler` option.

#### Options
Some options are functions(behaviour parameterization). all such functions reccive full `options` object as `this` parameter.

##### baseDir 
Required. Path in local file system to serve files from. 

#####  fileListProvider    

Function to get array of files basing on path. accepts `path` and `callback`. `callback` is `function(error, filesArray)`.
`filesArray` - array of files at given path, each file represented as [fs.Stats](https://nodejs.org/api/fs.html#fs_class_fs_stats)  object with `name` attached to it. 
```javascript
function dummyFileListProvider(path, callback) {
// return the same file for each path:
callback(null, 
[{
  dev: 2114,
  ino: 48064969,
  mode: 33188,
  nlink: 1,
  uid: 85,
  gid: 100,
  rdev: 0,
  size: 527,
  blksize: 4096,
  blocks: 8,
  atime: new Date(),
  mtime: new Date(),
  ctime: new Date(),
  birthtime: new Date(),
  name : "testfile.txt"
}] );
}
```
Default implementation provides list of files and directories in requested path excluding '.' and '..' 

#####  showHidden  
boolean. when false - does not show files with first symbol `.` (unix hidden files). `false` by default. 

#####  filter  
Predicate function to filter or modify file information.  Default implementation is:
```javascript
function defaultFilter(fileInfo){
   return this.showHidden || fileInfo.name[0] != '.';
}
```
if returned value is `true` file is preserved in output.

#####  comparator  
Function used to compare files during sorting. 
```javascript
function dymmyComparator(a, b){
  return a.name.localeCompare(b.name);
}
```
#####  rowTemplate            
Template to render view for 1 file. Default template is tabe, `rowTemplate` is expected to generate one row for this table.
Default template engine is `ejs`. Could be overrided by `rowTemplateProcessor`.

parameters passed to template: 
```javascript
        // all fields from fs.Stats object, name
        strAtime          = atime.toLocaleString();
        strMtime          = mtime.toLocaleString();
        strCtime          = ctime.toLocaleString();
        strBirthtime      = birthtime.toLocaleString();
        strMode           = // string like '-rwxrwx---' 
        baseUrl           = baseUrl;
        path              = //requested path;
        href              = // full link to this item
        size              = // size of file in bytes or "" for directory
        sizeHumanReadable = // size like "1.2GB" or "" for directory
        isDir             = // is it file or dir
```
if you need additional parameters, override `rowTemplateProcessor`, `filter` or `fileListProvider`.

#####  template
Template to render entire view. Default template is http page with tabe. Default template engine is `ejs`. Could be overrided by `templateProcessor`.

parameters passed to template: 
```javascript
        path            : //requested path
      , pathComponents  : // array of componens of path 
      , baseUrl         : baseUrl
      , upPath          : // path to '..' directory
      , files           : // array of rowTemplate generated strings
      , showUp          : path != '/'
      , options         : // options object
```
if you need additional parameters, add it to options, override `templateProcessor` or `render`.

#####  injectTableHead
String, table head for default template. default value is 
```html
<th class="fileTableHeadName">Name</th>
<th class="fileTableHeadSize">Size</th>
<th class="fileTableHeadDate">Modified</th>
<th class="fileTableHeadAttribute">Attribute</th>
```

#####  injectCSS
String, custom css. it will replace default css.

#####  injectJS
String, custom js. will be added at the bottom of body.
Empty by default.

#####  injectHead
String, text to append to `<head>` tag. Could be used to link external css, for example
```html
injectHead='<link rel="stylesheet" href="/css/custom.css">'
```

#####  injectBody             
String, text to append to `<body>` tag. Could be used to link external js, for example
```html
injectBody='<script src="js/custom.js"></script>'
```

#####  render
Function, recieves path, baseUrl, array of files and callback for result.
```javascript
function defaultRender(path, baseUrl, files, callback){
....
callback(error, generatedData);
}
```
by default uses `rowTemplateProcessor` and `templateProcessor` to generate data. 

#####  templateProcessor
Function, recieves object with data described in `template` section, returns generated html string. uses `ejs` by default. 
function defaultTemplateProcessor( renderData ){
    if (!this.templateCompiled) {
        this.templateCompiled = ejs.compile(this.template);
    }
    return this.templateCompiled(renderData);
}

#####  rowTemplateProcessor   
Function, recieves object with data described in `rowTemplate` section, returns generated html string. uses `ejs` by default. function defaultRowTemplateProcessor(fileInfo){
    if (!this.rowTemplateCompiled) {
        this.rowTemplateCompiled = ejs.compile(this.rowTemplate);
    }
    return this.rowTemplateCompiled(fileInfo);
}

#####  middlewareResultHandler
Function, express result handler. Use it to postprocess data instead of sending it to the client.
Default implementation is:
```javascript
function defaultMiddlewareResultHandler( error, data, req, res, next ){
    if (!error) return res.end(data);
    if (error.status == 404) return next();
    return next(error);
}
```

#####  scanConcurrency  
maximum number of parallel IO requests to hard drive. 10 by default.

