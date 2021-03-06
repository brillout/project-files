const assert = require("@brillout/reassert");
//const glob = require('glob');
const ignore_module = require("ignore");
// Alternative to glob-gitignore: https://github.com/sindresorhus/globby
const glob_gitignore = require("glob-gitignore");
const find_up_module = require("find-up");
const path_module = require("path");
const fs = require("fs");

module.exports = findProjectFiles;

function findProjectFiles(
  filename,
  { projectDir, onlyDirectories, noDirectories, within, ignoreSubProjects } = {}
) {
  assert.usage(filename.constructor === String);
  assert.usage(!within || path_module.isAbsolute(within));
  assert.usage(!projectDir || path_module.isAbsolute(projectDir));
  assert.usage(within || projectDir);

  if (onlyDirectories && !filename.endsWith("/")) {
    filename += "/";
  }

  within = within || projectDir;

  const glob_pattern = "**/" + filename;

  const glob_options = {
    cwd: within,
    nodir: noDirectories, // doesn't seem to always work in `glob-gitignore` and `glob`
    ignore: get_ignore({ cwd: within, ignoreSubProjects }),
    follow: true, // Follow symlinked directories
  };

  const paths_found =
    /*
        glob.sync(glob_pattern, glob_options)
        /*/
    // Alternative to glob-gitignore: https://github.com/sindresorhus/globby
    glob_gitignore
      .sync(glob_pattern, glob_options)
      //*/
      .map((relative_path) => path_module.join(within, relative_path));
  assert.internal(paths_found.length >= 0);
  assert.internal(
    paths_found.every((path_found) => path_module.isAbsolute(path_found))
  );
  return paths_found;
}

function get_ignore({ cwd, ignoreSubProjects }) {
  const ignore = ignore_module();

  const gitignore = get_gitignore_content({ cwd });
  let gitignore_content = get_gitignore_content({ cwd });
  gitignore_content += [
    "node_modules/",
    // Skip hidden directories such as Yarn v2's `.yarn`
    // (and Yarn wants you to commit that directory)
    // or Parcel's `.cache`.
    ".*/",
    "",
  ].join("\n");
  ignore.add(gitignore_content);

  if (ignoreSubProjects) {
    const packageJsonFiles = findProjectFiles("package.json", {
      cwd,
      noDirectories: true,
    });
    const subPackages = packageJsonFiles
      .map((packageJsonFile) => path_module.dirname(packageJsonFile))
      .filter((subPackageRoot) => subPackageRoot !== cwd)
      .map((subPackageRoot) => path_module.relative(cwd, subPackageRoot))
      .map(
        (subPackagePath) =>
          subPackagePath.split(path_module.sep).join("/") + "/"
      );
    ignore.add(subPackages.join("\n"));
  }

  return ignore;
}

function get_gitignore_content({ cwd }) {
  const gitignore_path = find_up(".gitignore", { cwd, noDirectories: true });

  let gitignore_content = null;
  try {
    gitignore_content = fs.readFileSync(gitignore_path).toString();
  } catch (e) {}

  return gitignore_content;
}

function find_up(filename, { onlyDirectories, noDirectories, cwd }) {
  assert.internal(filename);
  assert.internal(path_module.isAbsolute(cwd));

  /* TODO
    assert_not_implemented(!onlyDirectories);
    assert_not_implemented(!noDirectories);
    */

  const found_path = find_up_module.sync(filename, { cwd });

  assert.internal(
    !found_path ||
      (found_path.constructor === String && path_module.isAbsolute(found_path))
  );

  return found_path;
}
