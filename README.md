## Content Scraping

Get base html:

```
wget https://unicode.org/emoji/charts/full-emoji-list.html
```

Get sequences (with versions):

```
wget https://unicode.org/Public/emoji/12.0/emoji-sequences.txt
```

## Converting the list

1. Generate mapping of code prefix to version (as a trie?) from emoji-sequences

   ```
   231A..231B    ; Basic_Emoji              ; watch                                                          #  1.1  [2] (⌚..⌛)
   ```

   gets 231a to 231b and sets 1.1 as the root.

2. Get full list from full-emoji-list and gather:

   - category name (bighead)
   - sub category name (mediumhead)
   - code
   - cldr short name

   e.g., the html has the headers:

   ```
   <tr><th colspan='15' class='bighead'><a href='#smileys_&amp;_emotion' name='smileys_&amp;_emotion'>Smileys &amp; Emotion</a></th></tr>
   <tr><th colspan='15' class='mediumhead'><a href='#face-smiling' name='face-smiling'>face-smiling</a></th></tr>
   ```

3. Generate:

   ```
   {
     versions: [12.0, 11.0, ..., 1.1],
     categories: [
       {
         category: 'Smileys & Emotion',
         subs: {
           sub: 'face-smiling'
           emojis: [
             ['1f600', 'grinning face', 6.1]
           ]
         }
       }
     ]
   }
   ```

   Note: mult-codes as '1f3f4_e0067_e0062_e0065_e006e_e0067_e007f'
