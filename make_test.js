const fs = require('fs');
const path = require('path');

const unlockSrc = path.join(__dirname, '..', 'unlock-app', 'dist', 'index.html');
let htmlTemplate = fs.readFileSync(unlockSrc, 'utf8');

// create a dummy vault base64
const vaultBase64 = Buffer.from('dummy').toString('base64');
const injection = `<script id="vault-payload" type="text/plain">${vaultBase64}</script>`;
htmlTemplate = htmlTemplate.replace('</body>', `${injection}\n</body>`);

fs.writeFileSync(path.join(__dirname, 'test_secure.html'), htmlTemplate, 'utf8');
console.log('Done');
