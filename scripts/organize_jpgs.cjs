const fs = require('fs');
const path = require('path');

const JPG_DIR = path.resolve(__dirname, '../jpg');

const rules = [
  { dest: 'Norimono', regex: /(^|_)(airplane|bicycle|bus|crane_truck|cruise_ship|excavator|fire_engine|helicopter|hot_air_balloon|motorcycle|police_car|rocket|submarine|taxi|truck|ufo|yacht)(_|\.|$)/i },
  { dest: 'Dobutsu', regex: /(^|_)(alpaca|bear|cow|dolphin|frog|hedgehog|horse|pig|sheep|turtle|dinosaur|capybara|lion|cat|dog|elephant|giraffe|koala|unicorn|monkey|ninja_dog|owl|panda|penguin|rabbit|squirrel|fox)(_|\.|$)/i },
  { dest: 'Tabemono', regex: /(^|_)(apple|ramen|bowl|grapes|omurice|curry|pudding|parfait|banana|hamburger|macarons|pancakes|pizza|rice_ball|sandwich|crepe|shortcake|sushi|ice_cream|donut|watermelon)(_|\.|$)/i },
  { dest: 'Fantaji', regex: /(^|_)(angel|boy|alien|dragon|explorer|fairy|ghost|idol_singer|magical_girl|monster|ninja_throwing|pirate|prince|princess|robot|superhero|witch)(_|\.|$)/i },
];

fs.readdirSync(JPG_DIR).forEach(file => {
  if (file.endsWith('.jpg') || file.endsWith('.jpeg')) {
    let matched = false;
    for (const rule of rules) {
      if (rule.regex.test(file)) {
        const destDir = path.join(JPG_DIR, rule.dest);
        if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
        fs.renameSync(path.join(JPG_DIR, file), path.join(destDir, file));
        matched = true;
        break;
      }
    }
    if (!matched) {
      console.log('Unmatched:', file);
    }
  }
});
console.log('Done!');
