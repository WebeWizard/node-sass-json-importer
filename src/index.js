import _        from 'lodash';
import isThere  from 'is-there';
import path, {resolve, basename, extname} from 'path';

import 'json5/lib/register'; // Enable JSON5 support

export default function(options = {}) {
  return function(url, prev) {
    if (!isJSONfile(url)) {
      return null;
    }

    let includePaths = this.options.includePaths ? this.options.includePaths.split(path.delimiter) : [];
    let paths = []
      .concat(prev.slice(0, prev.lastIndexOf('/')))
      .concat(includePaths);

    const resolver = options.resolver || resolve;
    let fileName = paths
      .map(path => resolver(path, url))
      .filter(isThere)
      .pop();

    if (!fileName) {
      return new Error(`Unable to find "${url}" from the following path(s): ${paths.join(', ')}. Check includePaths.`);
    }

    // Prevent file from being cached by Node's `require` on continuous builds.
    // https://github.com/Updater/node-sass-json-importer/issues/21
    delete require.cache[require.resolve(fileName)];

    try {
      const fileContents = require(fileName);
      const extensionlessFilename = basename(fileName, extname(fileName));
      const json = Array.isArray(fileContents) ? { [extensionlessFilename]: fileContents } : fileContents;

      return {
        contents: transformJSONtoSass(json),
        file: fileName,
      };
    } catch(error) {
      return new Error(`node-sass-json-importer: Error transforming JSON/JSON5 to SASS. Check if your JSON/JSON5 parses correctly. ${error}`);
    }
  }
}

export function isJSONfile(url) {
  return /\.js(on)?5?$/.test(url);
}

export function transformJSONtoSass(json) {
  return Object.keys(json)
    .filter(key => isValidKey(key))
    .filter(key => json[key] !== '#')
    .map(key => `$${key}: ${parseValue(json[key])};`)
    .join('\n');
}

export function isValidKey(key) {
  return /^[^$@:].*/.test(key)
}

export function parseValue(value) {
  if (_.isArray(value)) {
    return parseList(value);
  } else if (_.isPlainObject(value)) {
    return parseMap(value);
  } else if (value === '') {
    return '""'; // Return explicitly an empty string (Sass would otherwise throw an error as the variable is set to nothing)
  } else {
    return value;
  }
}

export function parseList(list) {
  return `(${list
    .map(value => parseValue(value))
    .join(',')})`;
}

export function parseMap(map) {
  return `(${Object.keys(map)
    .filter(key => isValidKey(key))
    .map(key => `${key}: ${parseValue(map[key])}`)
    .join(',')})`;
}

// Super-hacky: Override Babel's transpiled export to provide both
// a default CommonJS export and named exports.
// Fixes: https://github.com/Updater/node-sass-json-importer/issues/32
// TODO: Remove in 3.0.0. Upgrade to Babel6.
module.exports = exports.default;
Object.keys(exports).forEach(key => module.exports[key] = exports[key]);
