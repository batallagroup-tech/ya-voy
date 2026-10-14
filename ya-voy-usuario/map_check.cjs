const fs = require('fs');
const sourceMap = require('source-map');
const rawSourceMap = JSON.parse(fs.readFileSync('dist/assets/index-C6mHw-_N.js.map', 'utf8'));
sourceMap.SourceMapConsumer.with(rawSourceMap, null, consumer => {
  // Line 16 could be anything, let's find the string "[object Object]" throwing
  // Actually, I don't have column number.
}).catch(console.error);
