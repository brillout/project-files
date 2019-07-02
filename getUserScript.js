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

function getFileProjectFiles(filePath) {
  const Project = require('./Project');
  assert.internal(Project && Project.constructor===Function, "cyclic dependency");

  const fileDir = pathModule.dirname(filePath);
  const {packageJson, projectDir} = (
    new Project({
      userDir: fileDir,
      packageJsonIsOptional: true,
    })
  );

  return {packageJson, projectDir};
}
function isBinCall(filePath) {
  const {packageJson, projectDir} = getFileProjectFiles(filePath);

  if( !packageJson || !packageJson.bin ){
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
