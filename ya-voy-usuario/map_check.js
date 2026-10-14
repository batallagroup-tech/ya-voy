const fs = require('fs');
const sourceMap = require('source-map');
const rawSourceMap = JSON.parse(fs.readFileSync('dist/assets/index-C6mHw-_N.js.map', 'utf8'));
sourceMap.SourceMapConsumer.with(rawSourceMap, null, consumer => {
  const pos = consumer.originalPositionFor({
    line: 16,
    column: 1
  });
  console.log(pos);
});
