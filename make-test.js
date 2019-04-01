// # Make Test
//
// Used to generate the files in test/*
//
// ```bash
// node make-test.js emojis-v12.json tests/emojis-v12.txt
// node make-test.js emojis-v12-no-skin-tone.json tests/emojis-v12-no-skin-tone.txt
// ```
//

const rw = require('rw');

const main = (data, outpath) => {
  const versionToEmojis = {};
  data.groups.forEach(({ group, subgroups }) => {
    subgroups.forEach(({ subgroup, emojis }) => {
      emojis.forEach(([code, name, version]) => {
        _setdefault(versionToEmojis, version, _array).push({ code, name });
      });
    });
  });

  const v2eArray = Object.entries(versionToEmojis).map(([k, v]) => [
    parseFloat(k),
    v
  ]);
  v2eArray.sort((a, b) => a[0] - b[0]);

  let result = '';

  v2eArray.forEach(([version, emojis]) => {
    result += `### v${version} - count ${emojis.length}\n\n`;
    emojis.forEach(({ name, code }) => {
      let line = `${code}\t${_asEmoji(code)}\t${name}`;
      if (code.endsWith('_fe0f')) {
        const t = code.replace(/_fe0f$/, '');
        line += `\t(UNQUALIFIED: ${t} ${_asEmoji(t)})`;
      }
      result += line + '\n';
    });
    result += '\n';
  });

  rw.dash.writeFileSync(outpath, result);
};

// ## Helpers

const _asEmoji = code => {
  const nums = code.split('_').map(val => parseInt(val, 16));
  return String.fromCodePoint.apply(String, nums);
};

const _array = () => [];

const _setdefault = (obj, key, deflt) => {
  if (obj[key] === undefined) {
    obj[key] = typeof deflt === 'function' ? deflt() : deflt;
  }
  return obj[key];
};

// ## CLI

if (require.main === module) {
  const args = process.argv.slice(2);
  const inpath = args[0] || '/dev/stdin';
  const outpath = args[1] || '/dev/stdout';

  const contents = rw.dash.readFileSync(inpath, 'utf8');
  main(JSON.parse(contents), outpath);
}
