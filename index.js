const assert = require('assert');
const { promisify } = require('util');
const fs = require('fs');
const readline = require('readline');

const readFileAsync = promisify(fs.readFile);

const FULL_EMOJI_LIST = './full-emoji-list.html';
const EMOJI_SEQUENCES = './emoji-sequences.txt';

// ## Main

const main = async () => {
  await getVersions();
};

// ## Get code-to-version object

const FQFD_SUFFIX = 'fe0f';
const RANGE_DIVIDER = '..';

const getVersions = async () => {
  const versions = {};

  // https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
  const fileStream = fs.createReadStream(EMOJI_SEQUENCES);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    const parsed = _parseLine(line);
    // console.log(line);
    if (parsed) {
      // console.log('  .. ', parsed);
      const { codes, version } = parsed;
      console.log(`${JSON.stringify(codes)} -> ${version}`);

      codes.forEach(code => {
        versions[code] = version;
      });
    }
  }
};

// ### Parse line
//
// @return {object({ start: string, end: string, version: float })}
//
const _parseLine = line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const m = line.match(/([^;]+);[^;]+;[^#]+#\s*([0-9]+(.[0-9]+)?)/);
    if (m) {
      let code_points = m[1]
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '');

      let sp = code_points.split(RANGE_DIVIDER);

      let start = sp[0];
      const end = sp[1] || null;
      const version = parseFloat(m[2].trim().split(/\s+/)[0]);

      let codes;

      if (end) {
        codes = _getRange(start, end);
      } else {
        codes = [start];
        // the fully qualified suffix seems to not be necessary usually?
        if (start.endsWith(FQFD_SUFFIX)) {
          codes.push(start.substring(0, start.length - FQFD_SUFFIX.length));
        }
      }

      return { codes, version };
    }
  }

  return null;
};

const _setDefault = (obj, key) => obj[key] || (obj[key] = {});

const _getRange = (startStr, endStr) => {
  let isMatching = true;
  let prefix = '';
  let startNum = 0;
  let endNum = 0;

  // find prefix, startNum, endNum
  for (let i = 0; i < startStr.length; i++) {
    let s = startStr.charAt(i);
    let e = endStr.charAt(i);
    if (s === e) {
      prefix += s;
    } else {
      startNum = parseInt(startStr.substring(i), 16);
      endNum = parseInt(endStr.substring(i), 16);
      break;
    }
  }

  // create the result
  const ret = [];

  let t = startNum;
  while (t <= endNum) {
    ret.push(`${prefix}${t.toString(16).toLowerCase()}`);
    t++;
  }

  return ret;
};

//

if (require.main === module) {
  main()
    .then(() => console.log('done'))
    .catch(err => console.error(err));
}
