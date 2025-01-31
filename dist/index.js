'use strict';

Object.defineProperty(exports, '__esModule', {
  value: true
});
exports.isJSONfile = isJSONfile;
exports.transformJSONtoSass = transformJSONtoSass;
exports.isValidKey = isValidKey;
exports.parseValue = parseValue;
exports.parseList = parseList;
exports.parseMap = parseMap;

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

var _lodash = require('lodash');

var _lodash2 = _interopRequireDefault(_lodash);

var _isThere = require('is-there');

var _isThere2 = _interopRequireDefault(_isThere);

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

require('json5/lib/register');

// Enable JSON5 support

exports['default'] = function () {
  var options = arguments.length <= 0 || arguments[0] === undefined ? {} : arguments[0];

  return function (url, prev) {
    if (!isJSONfile(url)) {
      return null;
    }

    var includePaths = this.options.includePaths ? this.options.includePaths.split(_path2['default'].delimiter) : [];
    var paths = [].concat(prev.slice(0, prev.lastIndexOf('/'))).concat(includePaths);

    var resolver = options.resolver || _path.resolve;
    var fileName = paths.map(function (path) {
      return resolver(path, url);
    }).filter(_isThere2['default']).pop();

    if (!fileName) {
      return new Error('Unable to find "' + url + '" from the following path(s): ' + paths.join(', ') + '. Check includePaths.');
    }

    // Prevent file from being cached by Node's `require` on continuous builds.
    // https://github.com/Updater/node-sass-json-importer/issues/21
    delete require.cache[require.resolve(fileName)];

    try {
      var fileContents = require(fileName);
      var extensionlessFilename = (0, _path.basename)(fileName, (0, _path.extname)(fileName));
      var json = Array.isArray(fileContents) ? _defineProperty({}, extensionlessFilename, fileContents) : fileContents;

      return {
        contents: transformJSONtoSass(json),
        file: fileName
      };
    } catch (error) {
      return new Error('node-sass-json-importer: Error transforming JSON/JSON5 to SASS. Check if your JSON/JSON5 parses correctly. ' + error);
    }
  };
};

function isJSONfile(url) {
  return (/\.js(on)?5?$/.test(url)
  );
}

function transformJSONtoSass(json) {
  return Object.keys(json).filter(function (key) {
    return isValidKey(key);
  }).filter(function (key) {
    return json[key] !== '#';
  }).map(function (key) {
    return '$' + key + ': ' + parseValue(json[key]) + ';';
  }).join('\n');
}

function isValidKey(key) {
  return (/^[^$@:].*/.test(key)
  );
}

function parseValue(value) {
  if (_lodash2['default'].isArray(value)) {
    return parseList(value);
  } else if (_lodash2['default'].isPlainObject(value)) {
    return parseMap(value);
  } else if (value === '') {
    return '""'; // Return explicitly an empty string (Sass would otherwise throw an error as the variable is set to nothing)
  } else {
      return value;
    }
}

function parseList(list) {
  return '(' + list.map(function (value) {
    return parseValue(value);
  }).join(',') + ')';
}

function parseMap(map) {
  return '(' + Object.keys(map).filter(function (key) {
    return isValidKey(key);
  }).map(function (key) {
    return key + ': ' + parseValue(map[key]);
  }).join(',') + ')';
}

// Super-hacky: Override Babel's transpiled export to provide both
// a default CommonJS export and named exports.
// Fixes: https://github.com/Updater/node-sass-json-importer/issues/32
// TODO: Remove in 3.0.0. Upgrade to Babel6.
module.exports = exports['default'];
Object.keys(exports).forEach(function (key) {
  return module.exports[key] = exports[key];
});