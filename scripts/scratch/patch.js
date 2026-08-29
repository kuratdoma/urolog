const fs = require('fs');
const file = '/Users/alp/Documents/antigravity/UrologV3.3/frontend/components/clinical/prostate-map/ProstatMapSVG.tsx';
let content = fs.readFileSync(file, 'utf8');

const target = `<svg \n          viewBox="0 0 1186 1428" \n          className="absolute inset-0 w-full h-full z-10"\n        >`;
const replacement = `<svg \n          viewBox="0 0 1186 1428" \n          className="absolute inset-0 w-full h-full z-10"\n          onClick={(e) => {\n            const rect = e.currentTarget.getBoundingClientRect();\n            const scaleX = 1186 / rect.width;\n            const scaleY = 1428 / rect.height;\n            const x = (e.clientX - rect.left) * scaleX;\n            const y = (e.clientY - rect.top) * scaleY;\n            console.log(` + '`SVG_CALIBRATION_CLICK_PX: X=${Math.round(x)} Y=${Math.round(y)}`' + `);\n          }}\n        >`;

content = content.replace(target, replacement);
fs.writeFileSync(file, content);
