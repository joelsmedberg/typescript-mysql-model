rm -rf ./build
rm -rf ./test/database/generated/
tsc
cd build
rm -rf test
cd ..
# node inc-version.js
cp package.json build/package.json
cp package.json build/Readme.md
cd build
npm publish