# Emojis JSON

A JSON file containing group, subgroup, character code, name, and version information for emojis based on the datafiles provided by [unicode.org](https://unicode.org). The version information can be used to check for support by Emoji release number.

## Content Scraping

Data sources loaded from unicode.org website:

```
cd data-sources/
wget https://unicode.org/Public/emoji/12.0/emoji-test.txt
wget https://unicode.org/Public/emoji/12.0/emoji-sequences.txt
wget https://unicode.org/Public/emoji/12.0/emoji-zwj-sequences.txt
```

- emoji-test.txt has the full list of emojis with names
- sequences.txt files have the emoji versions

## Generating output

The following command outputs the

```bash
node index.js --pretty > emojis-v12.json
node index.js --pretty --no-skin-tone > emojis-v12-no-skin-tone.json
```

Usage:

```
node index.js [--no-skin-tone|-S] [--pretty|-p]
```

## Output

See emojis-by-category.json, but the general structure is:

```
{
  "versions": [12, 11, ...],
  "tests": [
    [12, "1f90d"],
    ...
  ],
  "groups": [
    {
      "group": "Smileys & Emotion",
      "subgroups": [
        {
          "subgroup": "face-smiling",
          "emojis": [
            ["1f600", "grinning face", 6.0],
            ...
          ]
        },
        ...
      ]
    },
    ...
  ]
```

- `versions` - all emoji release versions in the dataset (in descending order)
- `tests` - specific codes that can be used to test for support by version number (in descending order)
- `groups` - data containing group -> subgroup -> emojis

NOTE: the code value is a lowercase string of the hex values with multiple character codes separated by underscores. This makes it easier to review by eye, I could consider changing this... but you can convert a code into the bytes for an emoji character via:

```js
const _asEmoji = code => {
  const nums = code.split('_').map(val => parseInt(val, 16));
  return String.fromCodePoint.apply(String, nums);
};
```
