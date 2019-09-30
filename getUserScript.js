const pathModule = require('path');
const assert = require('@brillout/reassert');

/*
const DEBUG = true;
/*/
const DEBUG = false;
//*/

module.exports = getUserScript;

function getUserScript() {
    const callstack = getCallstack();
    if(DEBUG) console.log('stack trace', callstack);
    for( let i = 0; i<callstack.length; i++ ){
      const filePath = callstack[i];
      if( isDependency(filePath) ){
        break;
      }
      const is_bin_call = isBinCall(filePath);
      if(DEBUG) console.log('is bin call', filePath, is_bin_call);
      if( is_bin_call ){
        assert.internal(i===0, {filePath, callstack});
        return null;
      }
      return filePath;
    }
    return null;
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
function isDependency(filePath) {
    return filePath.split(pathModule.sep).includes('node_modules');
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
