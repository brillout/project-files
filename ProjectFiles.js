const assert = require('@brillout/reassert');
const path = require('path');
const findProjectFiles = require('./findProjectFiles');
const find_up = require('find-up');
const getUserScript = require('./getUserScript');
assert.internal(getUserScript && getUserScript.constructor===Function, "cyclic dependency");

module.exports = ProjectFiles;

function ProjectFiles({userDir, packageJsonIsOptional}={}) {
  let userScript;
  if( !userDir ){
    userScript = getUserScript();
    assert.internal(userScript===null || userScript && path.isAbsolute(userScript), {userScript});
    userDir = (
      userScript ? (
        path.dirname(userScript)
      ) : (
        process.cwd()
      )
    );
  }
  assert.internal(userDir && path.isAbsolute(userDir));

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
      /* `userDir` and `userScript` should be implementation details
      userDir,
      userScript,
      */
      projectDir,
      findFiles,
      findFile,
      packageJson,
      packageJsonFile,
    }
  );

  return this;

  function findFiles(filename, opts) {
    assert.internal(projectDir);
    return findProjectFiles(filename, {projectDir, ...opts})
  }

  function findFile(...args) {
    let files = findFiles(...args);
    files = sortByPathDepth(files);
    file = files[0] || null;
    assert.internal(file===null || path.isAbsolute(file) && !isOutsideProject(file), {projectDir, file});

    return file;

    function sortByPathDepth(files) {
      files = files.sort((file1, file2) => {
        const distance1 = getDistanceToRoot(file1);
        const distance2 = getDistanceToRoot(file2);
        assert.internal(distance2.constructor===Number && distance2!==distance1);
        return distance1 - distance2;
      });
      assert.internal(!files[0] || !files[1] || getDistanceToRoot(files[0])<getDistanceToRoot(files[1]));
      return files;
    }
    function getDistanceToRoot(file){
      assert.internal(!isOutsideProject(file), {projectDir, file});
      return file.split(path.sep).length;
    }
  }

  function isOutsideProject(file) {
    const isOutsideProject = (
      !isAncestorDirectory(
        projectDir,
        path.dirname(file)
      )
    );
  }
}

function isAncestorDirectory(ancestor, descendant) {
  assert.internal(path.isAbsolute(ancestor));
  assert.internal(path.isAbsolute(descendant));

  const ancestor_dirs   =   ancestor.split(path.sep).filter(dir => dir!=='');
  const descendant_dirs = descendant.split(path.sep).filter(dir => dir!=='');

  return ancestor_dirs.every((dir, i) => descendant_dirs[i] === dir);
}
