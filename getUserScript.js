const find_up = require('find-up');
const pathModule = require('path');
const assert = require('@brillout/reassert');

module.exports = {getUserScript, findProjectRoot};

function getUserScript() {
  const userScripts = getUserScripts();
  const userScript = userScripts.slice(-1)[0];
  return userScript;
}

function getUserScripts() {
  const callstack = getCallstack();
  const userScripts = []
  for( let i = 0; i<callstack.length; i++ ){
    const filePath = callstack[i];
    if( isDependency(filePath) ){
      // We can cut off the whole stack at the first `node_modules/*` file
      break;
    }
    if( isBinEntry(filePath) ){
      // CLI calls don't have any userScripts
      assert.internal(i===0, {filePath, callstack});
      userScripts.length = 0;
      assert.internal(userScripts.length===0);
      break;
    }
    userScripts.push(filePath);
  }
  return userScripts;
}

function findProjectRoot(dirPath, {packageJsonIsOptional=false}={}) {
  assert.internal(dirPath && pathModule.isAbsolute(dirPath));
  const packageJsonFile = find_up.sync('package.json', {cwd: dirPath+'/'});
  assert.usage(
    packageJsonFile || packageJsonIsOptional,
    "Could not find package.json between `/` and `"+dirPath+"`",
  );

  const projectDir = pathModule.dirname(packageJsonFile);

  let packageJson;
  if( packageJsonFile ){
    try {
      packageJson = eval('require')(packageJsonFile);
    } catch(err) {
      assert.usage(
        packageJsonIsOptional,
        err,
        "Couldn't load `"+packageJsonFile+"`. See error above.",
      );
      packageJson = null;
    }
  }
  assert.internal(packageJson===null || packageJson.constructor===Object);

  return {projectDir, packageJson, packageJsonFile};
}

function isBinEntry(filePath) {
  const fileDir = pathModule.dirname(filePath);
  const {packageJson, projectDir} = findProjectRoot(fileDir, {packageJsonIsOptional: true});

  if( !packageJson || !packageJson.bin ){
    return false;
  }

  const p1 = require.resolve(pathModule.resolve(projectDir, packageJson.bin));
  const p2 = require.resolve(filePath);
  return p1===p2;
}

function isDependency(filePath) {
  // If a `filePath` contains `node_modules` then it's a dependency
  const inNodeModuleDir = filePath.split(pathModule.sep).includes('node_modules');
  if( inNodeModuleDir ){
    return true;
  }

  // Catch the case when using `npm link` for `@brillout/project-files`
  const isLinked = filePath.startsWith(__dirname);
  if( isLinked ){
    return true;
  }

  return false;
}

function getCallstack() {
  const callstack = [];
  for( let i = callstack_raw.length-1; i>=0; i-- ){
    const call = callstack_raw[i];
    if( call.isNative() ){
      continue;
    }
    const filePath = call.getFileName();
    if( ! filePath ){
      continue;
    }
    if( isNode(filePath) ){
      continue;
    }
    callstack.push(filePath);
  }
  return callstack;
}
function isNode(filePath) {
    return !pathModule.isAbsolute(filePath);
}

// We get the callstack now to make sure we don't get the callstack of an event loop
const callstack_raw = getRawCallstack();
function getRawCallstack() {
    const callsites = require('callsites');

    const stackTraceLimit__original = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;
    const callstack_raw = callsites();
    Error.stackTraceLimit = stackTraceLimit__original;

    return callstack_raw;
}
