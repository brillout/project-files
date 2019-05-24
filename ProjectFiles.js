module.exports = ProjectFiles;

function ProjectFiles({userDir, packageJsonIsOptional}={}) {
  const assert = require('@brillout/reassert');
  const path = require('path');
  const findProjectFiles_ = require('./findProjectFiles');
  const find_up = require('find-up');

  if( !userDir ){
    const getUserDir = require('@brillout/get-user-dir');
    assert.internal(getUserDir && getUserDir.constructor===Function, "cyclic dependency");
    userDir = getUserDir();
    assert.internal(userDir);
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
