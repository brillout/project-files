module.exports = ProjectFiles;

function ProjectFiles({userDir, packageJsonIsOptional}={}) {
  const assert = require('@brillout/reassert');
  const path = require('path');
  const findProjectFiles_ = require('./findProjectFiles');
  const find_up = require('find-up');

  let userScript;
  if( !userDir ){
    const getUserScript = require('./getUserScript');
    assert.internal(getUserScript && getUserScript.constructor===Function, "cyclic dependency");
    userScript = getUserScript();
    assert.internal(userScript===null || userScript && path.isAbsolute(userScript), {userScript});
    userDir = (
      userScript ? (
        path.dirname(userScript)
      ) : (
        process.cwd()
      )
    );
    assert.internal(userDir && path.isAbsolute(userDir));
  }

  const packageJsonFile = find_up.sync('package.json', {cwd: userDir+'/'});
  assert.usage(
    packageJsonFile || packageJsonIsOptional,
    "Could not find package.json between `/` and `"+userDir+"`",
  );

  let packageJson;
  try {
    packageJson = require(packageJsonFile);
  } catch(err) {
    assert.usage(
      packageJsonIsOptional,
      err,
      "Couldn't load `"+packageJsonFile+"`. See error above",
    );
    packageJson = null;
  }
  assert.internal(packageJson===null || packageJson.constructor===Object);

  const projectDir = path.dirname(packageJsonFile);

  Object.assign(
    this,
    {
      userDir,
      userScript,
      packageJson,
      packageJsonFile,
      projectDir,
      findProjectFiles,
    }
  );

  return this;

  function findProjectFiles(filename, opts) {
    return findProjectFiles_(filename, {projectDir, ...opts})
  }
}
