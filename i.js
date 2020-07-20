const name = ['0'];
const txt = 'AH |';

if (txt.length && txt.trim().startsWith('|')) name.push(txt);
else if (txt.length && txt.trim().endsWith('|')) name.unshift(txt);

console.log(name);
