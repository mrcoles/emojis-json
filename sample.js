var cheerio = require('cheerio');
var html = "<table><tr><th colspan='15' class='bighead'><a href='#smileys_&amp;_emotion' name='smileys_&amp;_emotion'>Smileys &amp; Emotion</a></th></tr></table>";
var $ = cheerio.load(html);
var b = $('th.bighead');
