const puter = require('@heyputer/puter.js');
console.log(Object.keys(puter));
try {
    console.log(puter.default ? Object.keys(puter.default) : "No default");
} catch (e) { }
