const assert = require('assert');
const { promisify } = require('util');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rw = require('rw');

const readFileAsync = promisify(fs.readFile);

const FQFD_SUFFIX = '_fe0f';
const RANGE_DIVIDER = '..';

const _pathTo = filename => path.join(__dirname, 'data-sources', filename);

const EMOJI_TEST = _pathTo('emoji-test.txt');
const EMOJI_SEQUENCES = _pathTo('emoji-sequences.txt');
const EMOJI_ZWJ_SEQUENCES = _pathTo('emoji-zwj-sequences.txt');
const ALL_EMOJI_SEQUENCES = [EMOJI_SEQUENCES, EMOJI_ZWJ_SEQUENCES];

// ## Main

const main = async (pretty = false, noSkinTone = false) => {
  const codeToVersion = await getCodeToVersion();
  const groups = await getFullList(codeToVersion, noSkinTone);

  const versionsSet = new Set(Object.values(codeToVersion));
  const versions = Array.from(versionsSet);
  versions.sort((a, b) => b - a); // sort in descending order

  const tests = getVersionTests(versions, groups);

  const result = { versions, tests, groups };

  const content = pretty
    ? JSON.stringify(result, null, 2)
    : JSON.stringify(result);

  rw.writeFileSync('/dev/stdout', content, 'utf8');
};

// ## Get code-to-version object

const getCodeToVersion = async () => {
  const codeToVersion = {};

  for (const filepath of ALL_EMOJI_SEQUENCES) {
    await _getCodeToVersionHelper(filepath, codeToVersion);
  }
  return codeToVersion;
};

const _getCodeToVersionHelper = async (filepath, codeToVersion) => {
  const rl = _asyncLineReader(filepath);

  for await (const line of rl) {
    const parsed = _parseVersionLine(line);
    // console.log(line);
    if (parsed) {
      // console.log('  .. ', parsed);
      const { codes, version } = parsed;
      // console.log(`${JSON.stringify(codes)} -> ${version}`);

      codes.forEach(code => {
        codeToVersion[code] = version;
      });
    }
  }

  return codeToVersion;
};

// Parse line - returns { start: string, end: string, version: float }
const _parseVersionLine = line => {
  line = line.trim();
  if (line && !line.startsWith('#')) {
    const m = line.match(/([^;]+);[^;]+;[^#]+#\s*([0-9]+(.[0-9]+)?)/);
    if (m) {
      let code_points = m[1].trim().toLowerCase();

      assert(
        code_points.indexOf(RANGE_DIVIDER) === -1 ||
          code_points.indexOf(' ') === -1,
        `cannot have spaces and a range divider: ${code_points}`
      );

      code_points = code_points.replace(/\s+/g, '_');

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

  const suffixLen = startStr.length - prefix.length;

  // create the result
  const ret = [];

  let t = startNum;
  while (t <= endNum) {
    const suffix = t
      .toString(16)
      .toLowerCase()
      .padStart(suffixLen, '0');
    ret.push(prefix + suffix);
    t++;
  }

  return ret;
};

// ## Get full list

const getFullList = async (codeToVersion = {}, noSkinTone = false) => {
  const groupsArr = [];

  const rl = await _asyncLineReader(EMOJI_TEST);

  let subgroupsArr = null;
  let emojisArr = null;

  let prevName = null; // only take first code for a name

  for await (let line of rl) {
    line = line.trim();
    const parsed = _parseTestLine(line);

    // parse the row - needs valid row, skip name dupes (first
    // should be a fully-qualified code), check noSkinTone flag
    if (
      parsed !== null &&
      (!prevName || !parsed.name || parsed.name !== prevName) &&
      (!noSkinTone || !parsed.name || parsed.name.indexOf('skin tone') === -1)
    ) {
      // console.log(JSON.stringify(parsed));
      if (parsed.group) {
        let group = parsed.group;
        subgroupsArr = [];
        groupsArr.push({ group, subgroups: subgroupsArr });
      } else if (parsed.subgroup) {
        subgroup = parsed.subgroup;
        assert(
          subgroupsArr,
          `must have subgroupArr to add subgroup: ${subgroup}`
        );
        emojisArr = [];
        subgroupsArr.push({ subgroup, emojis: emojisArr });
      } else {
        const { code, name } = parsed;
        const version = codeToVersion[code];
        assert(
          emojisArr,
          `must have emojisArr to add an emoji: ${code} (${name})`
        );
        emojisArr.push([code, name, version]);
        // console.log(group, subgroup, code, name, version);
        assert(version, `no version found for ${code} (${name})`);
      }
    }

    if (parsed && parsed.name) {
      prevName = parsed.name;
    }
  }

  return groupsArr;
};

const _prfxGroup = '# group:';
const _prfxSubgroup = '# subgroup:';

const _parseTestLine = line => {
  if (line.startsWith(_prfxGroup)) {
    const group = line.substring(_prfxGroup.length).trim();
    return { group };
  } else if (line.startsWith(_prfxSubgroup)) {
    const subgroup = line.substring(_prfxSubgroup.length).trim();
    return { subgroup };
  } else if (line && !line.startsWith('#')) {
    const m = line.match(/([^;]+);([^;]+)#\s*[^\s]+\s(.*)/);
    if (m) {
      const code = m[1]
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_');
      const status = m[2].trim();
      const name = m[3].trim();
      return { code, status, name };
    }
  }
  return null;
};

// ## Version tests

const getVersionTests = (versions, groups) => {
  const tests = new Map([
    [12, '1f90d'], // white heart
    [11, '1f970'], // smiling face with hearts
    [10, '1f929'], // start-struck
    [9, '1f923'], // rolling on the floor laughing
    [8, '1f643'], // upside down face
    [7, '1f642'], // slightly smiling face
    [6, '1f428'], // koala
    [6.1, '1f617'], // kissing face
    [5.2, '26f0'], // mountain
    [5.1, '2b50'], // star
    [4.1, '26ab'], // black circle
    [4, '2615'], // hot beverage
    [3.2, '2764'], // red heart
    [3, '0023_fe0f_20e3'], // keycap: #
    [1.1, '231a'] // watch
  ]);

  versions.forEach(version => {
    if (!tests.has(version)) {
      let match;
      for (const { subgroups } of groups) {
        for (const { emojis } of subgroups) {
          match = emojis.find(([c, n, v]) => version === v);
          if (match) {
            tests.set(v, c);
            break;
          }
        }
        if (match) {
          break;
        }
      }
    }
  });

  return Array.from(tests.entries());
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
  const args = process.argv.slice(1);
  const _has = flags => !!flags.find(f => args.includes(f));

  const pretty = _has(['-p', '--pretty']);
  const noSkinTone = _has(['-S', '--no-skin-tone']);
  main(pretty, noSkinTone).catch(err => console.error(err));
}
