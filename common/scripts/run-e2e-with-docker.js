/*---------------------------------------------------------------------------------------------
* Copyright (c) Bentley Systems, Incorporated. All rights reserved.
* See LICENSE.md in the project root for license terms and full copyright notice.
*--------------------------------------------------------------------------------------------*/
const path = require("path");
const { exec } = require("child_process");
const packageName = process.argv[2];
const dockerImageName = `${packageName}-e2e-test-image`;
const dockerContainerName = `${packageName}-e2e-test-container`;
const srcFolderLocation = `packages/itwin/${packageName}/src`;

const execute = (command) => new Promise((resolve, reject) => {
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing command: ${error}`);
      return reject(error);
    }
    console.log(stdout);
    console.error(stderr);
    resolve();
  });
});

try {
  const currentDirectory = process.cwd();
  // cd to the root directory from property-grid directory
  const rootDirectory = path.resolve(currentDirectory, "../../../");
  process.chdir(rootDirectory);
} catch (err) {
  console.error(`Failed to change directory: ${err}`);
  return;
}

// Build the Docker image
execute(`docker build --build-arg PACKAGE_NAME=${packageName} -t ${dockerImageName} .`)
  .then(() => {
      // Run Docker container
      return execute(`docker run --name ${dockerContainerName} -e UPDATE_SNAPSHOTS=${process.env.UPDATE_SNAPSHOTS} ${dockerImageName}`);
  })
  .then(() => {
    if (process.env.UPDATE_SNAPSHOTS) {
      // Copy snapshots from docker container to the local repo
      return execute(`docker cp ${dockerContainerName}:/workspaces/viewer-components-react/${srcFolderLocation}/e2e-tests ./${srcFolderLocation}`);
    };
  })
  .catch(() => {
    // If error ocurred print the output from docker container
    return execute(`docker logs ${dockerContainerName}`).then(() => {
      process.exit(1);
    });
  })
  .finally(() => {
    // Delete docker image and container
    execute(`docker rm ${dockerContainerName}`);
    // .then(() => { execute(`docker rmi ${dockerImageName}`)});
  });