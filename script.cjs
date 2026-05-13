const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
code = code.replace(/doc\.setTextColor\(30, 41, 59\);/g, 'doc.setTextColor(0, 0, 0);');
code = code.replace(/doc\.setTextColor\(71, 85, 105\);/g, 'doc.setTextColor(40, 40, 40);');
fs.writeFileSync('src/App.tsx', code);
