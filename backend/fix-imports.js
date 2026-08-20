import fs from 'fs';
import path from 'path';

function walk(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (file.endsWith('.js')) {
      results.push(file);
    }
  });
  return results;
}

const files = walk('./backend/src');

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Compute depth from backend/src to create correct relative paths
  const relativeFromSrc = path.relative('./backend/src', path.dirname(file));
  const depth = relativeFromSrc === '' ? 0 : relativeFromSrc.split(path.sep).length;
  const prefix = depth === 0 ? './' : '../'.repeat(depth);

  content = content.replace(/@\/lib\/mongodb/g, `${prefix}config/db.js`);
  content = content.replace(/@\/models\/([a-zA-Z0-9_]+)/g, `${prefix}models/$1.js`);
  content = content.replace(/@\/services\/([a-zA-Z0-9_\/]+)/g, (match, p1) => {
    // If p1 already has .js, don't append it again
    return `${prefix}services/${p1}${p1.endsWith('.js') ? '' : '.js'}`;
  });
  content = content.replace(/@\/lib\/store/g, `${prefix}utils/store.js`);
  content = content.replace(/@\/lib\/utils/g, `${prefix}utils/utils.js`);
  
  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`Updated imports in ${file}`);
  }
});
