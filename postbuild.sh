tsc
node inc-version.js
cp package.json build/package.json
cp package.json build/Readme.md
cd build
npm publish