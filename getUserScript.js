const pathModule = require('path');
const assert = require('@brillout/reassert');

// We get the callstack now to make sure we don't get the callstack of an event loop
const callstack = getV8StackTrace();

/*
const DEBUG = true;
/*/
const DEBUG = false;
//*/

module.exports = getUserScript;

/*
const GLOBAL_KEY = '__@brillout/get-user-dir__userDir';

// We call `getUserScript` here because it doesn't work in an event loop
const userScript = getUserScript();

module.exports = getUserDir;
module.exports.setUserDir = setUserDir;
module.exports.userDir = null;

function getUserDir() {
    if(DEBUG) console.log("globally set", global[GLOBAL_KEY]);
    if( global[GLOBAL_KEY] ) {
        return global[GLOBAL_KEY];
    }

    if(DEBUG) console.log('first user script', userScript);
    if( userScript ) {
      const userDir = pathModule.dirname(userScript);
      assert.internal(userDir && pathModule.isAbsolute(userDir));
      return userDir;
    }

    if(DEBUG) console.log('current working directory', process.cwd());
    return process.cwd();
}

function setUserDir(userDir) {
    global[GLOBAL_KEY] = userDir;
}
*/

function getUserScript() {
    const stackPaths = getStackPaths();
    if(DEBUG) console.log('stack trace', stackPaths);
    for( let i = 0; i<stackPaths.length; i++ ){
      const filePath = stackPaths[i];
      const is_bin_call = isBinCall(filePath);
      if(DEBUG) console.log('is bin call', filePath, is_bin_call);
      if( is_bin_call ){
        assert.internal(i===0, {filePath, stackPaths});
        return null;
      }
      /*
      const is_not_user_code = isNotUserCode(filePath);
      if(DEBUG) console.log('is not user code', filePath, is_not_user_code);
      if( is_not_user_code ){
        continue;
      }
      */
      return filePath;
    }
    return null;
}

function getStackPaths() {
  const stackPaths = [];
  for( let i = callstack.length-1; i>=0; i-- ){
    const call = callstack[i];
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
    if( isDependency(filePath) ){
      continue;
    }
    stackPaths.push(filePath);
  }
  return stackPaths;
}

function isNotUserCode(filePath) {
  const {packageJson, projectDir} = getFileProjectFiles(filePath);

  if( !packageJson ) {
    return false;
  }
  assert.internal(packageJson.constructor===Object);
  assert.internal(projectDir);
  if( ((packageJson||{})['@brillout/get-user-dir']||{}).isNotUserCode ){
    return true;
  }
  const {name} = require('./package.json');
  assert.internal(name);
  if( packageJson.name===name ){
    return true;
  }
  if( packageJson.dependencies[name] ){
    return true;
  }
  return false;
}
function getFileProjectFiles(filePath) {
  const ProjectFiles = require('./ProjectFiles');
  assert.internal(ProjectFiles && ProjectFiles.constructor===Function, "cyclic dependency");

  const fileDir = pathModule.dirname(filePath);
  const {packageJson, projectDir} = (
    new ProjectFiles({
      userDir: fileDir,
      packageJsonIsOptional: true,
    })
  );

  return {packageJson, projectDir};
}
function isBinCall(filePath) {
  const {packageJson, projectDir} = getFileProjectFiles(filePath);

  if( !packageJson.bin ){
    return false;
  }

  const p1 = require.resolve(pathModule.resolve(projectDir, packageJson.bin));
  const p2 = require.resolve(filePath);
  return p1===p2;
}
function isNode(filePath) {
    return !pathModule.isAbsolute(filePath);
}
function isDependency(filePath) {
    return filePath.split(pathModule.sep).includes('node_modules');
}
function getV8StackTrace() {
    const callsites = require('callsites');

    const stackTraceLimit__original = Error.stackTraceLimit;
    Error.stackTraceLimit = Infinity;
    const calls = callsites();
    Error.stackTraceLimit = stackTraceLimit__original;

    return calls;
}
