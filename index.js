const assert = require('assert');
const { promisify } = require('util');
const fs = require('fs');
const readline = require('readline');

const cheerio = require('cheerio');
const pcheerio = require('pseudo-cheerio');

const readFileAsync = promisify(fs.readFile);

const FULL_EMOJI_LIST = './full-emoji-list.html';
const EMOJI_SEQUENCES = './emoji-sequences.txt';

// ## Main

const main = async () => {
  // await getVersions();
  await getFullList();
};

// ## Get code-to-version object

const FQFD_SUFFIX = 'fe0f';
const RANGE_DIVIDER = '..';

const getVersions = async () => {
  const versions = {};

  const rl = _asyncLineReader(EMOJI_SEQUENCES);

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

// Parse line - returns { start: string, end: string, version: float }
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

// ## Get full list

const getFullList = async () => {
  console.log('READ FILE!!!!!!'); //REMMM
  const rl = await _asyncLineReader(FULL_EMOJI_LIST);

  let curRow = '';

  let category = null;
  let sub = null;

  for await (let line of rl) {
    line = line.trim();
    if (line.startsWith('<tr>')) {
      assert(!curRow, `found a tr inside a tr! "${curRow}" and "${line}"`);
      curRow += line;
    } else if (curRow) {
      curRow += line;
    }
    if (line.endsWith('</tr>')) {
      const parsed = _parseRow(curRow);

      // parse the row
      if (parsed !== null) {
        if (parsed.category) {
          category = parsed.category;
        } else if (parsed.sub) {
          sub = parsed.sub;
        } else {
          const { code, name } = parsed;
          console.log(category, sub, code, name);
        }
      }

      curRow = '';
    }
  }
};

const _parseRow = rowHtml => {
  const $ = cheerio.load(`<table>${rowHtml}</table>`);

  const bigheadElt = $('th.bighead');
  if (bigheadElt.length) {
    const category = bigheadElt.text().trim();
    return { category };
  }

  const mediumheadElt = $('th.mediumhead');
  if (mediumheadElt.length) {
    const sub = mediumheadElt.text().trim();
    return { sub };
  }

  const codeElt = $('td.code');
  if (codeElt.length) {
    const code = $('td.code a[name]').attr('name');
    const name = $('td')
      .last()
      .text()
      .trim();
    return { code, name };
  }

  return null;
};

// ## Helpers

const _asyncLineReader = filepath => {
  // https://nodejs.org/api/readline.html#readline_example_read_file_stream_line_by_line
  const fileStream = fs.createReadStream(filepath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });
  return rl;
};

//

if (require.main === module) {
  main()
    .then(() => console.log('done'))
    .catch(err => console.error(err));
}
