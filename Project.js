const assert = require('@brillout/reassert');
const path = require('path');
const findProjectFiles = require('./findProjectFiles');
const {getUserScript, findProjectRoot} = require('./getUserScript');

module.exports = Project;

function Project() {
  const userScript = getUserScript();

  assert.internal(userScript===null || userScript && path.isAbsolute(userScript), {userScript});
  const userDir = (
    userScript ? (
      path.dirname(userScript)
    ) : (
      process.cwd()
    )
  );
  assert.internal(userDir && path.isAbsolute(userDir));

  const {packageJsonFile, packageJson, projectDir} = findProjectRoot(userDir);
  assert.internal(packageJson===null || packageJson.constructor===Object);

  return {
    userDir,
    projectDir,
    findFiles,
    findConfigFile,
    packageJson,
    packageJsonFile,
  };

  function findFiles(filename, opts) {
    assert.internal(projectDir);
    return findProjectFiles(filename, {projectDir, ...opts})
  }

  function findConfigFile(...args) {
    let files = findFiles(...args);

    // Only consider files that are in a parent directory
    // I.e. ignore files in sibling directories
    files = (
      files
      .filter(file => isAncestorDirectory(path.dirname(file), userDir))
    );

    files = sotByDistance(files);

    file = files[0] || null;
    assert.internal(file===null || path.isAbsolute(file) && !isOutsideProject(file), {projectDir, file});

    return file;

    function sotByDistance(files) {
      files = files.sort((file1, file2) => {
        const distance1 = getDistance(file1);
        const distance2 = getDistance(file2);
        assert.internal(distance2.constructor===Number && distance2!==distance1, {file1, file2});
        return distance1 - distance2;
      });
      assert.internal(!files[0] || !files[1] || getDistance(files[0])<getDistance(files[1]));
      return files;
    }
    function getDistance(file){
      assert.internal(!isOutsideProject(file), {projectDir, file});
      assert.internal(path.isAbsolute(file));
      assert.internal(path.isAbsolute(userDir));
      file = path.relative(userDir, file);
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
