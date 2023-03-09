import * as core from '@actions/core'

// Constants for the lock file
const LOCK_BRANCH = 'branch-deploy-lock'
const LOCK_FILE = 'lock.json'
const NO_LOCK = 'lock does not exist'
const FOUND_LOCK = 'lock exists'

// Helper function for checking if a deployment lock exists
// :param octokit: The octokit client
// :param context: The GitHub Actions event context
// :returns: true if the lock exists, false if it does not
export async function check(octokit, context) {
  // Check if the lock branch already exists
  try {
    await octokit.rest.repos.getBranch({
      ...context.repo,
      branch: LOCK_BRANCH
    })
  } catch (error) {
    // If the lock file doesn't exist, return
    if (error.status === 404) {
      core.info(NO_LOCK)
      core.setOutput('locked', 'false')
      return false
    }
  }

  // If the lock branch exists, check if a lock file exists
  try {
    // Get the lock file contents
    const response = await octokit.rest.repos.getContent({
      ...context.repo,
      path: LOCK_FILE,
      ref: LOCK_BRANCH
    })

    // Decode the file contents to json
    var lockData
    try {
      lockData = JSON.parse(
        Buffer.from(response.data.content, 'base64').toString()
      )
    } catch (error) {
      core.warning(error.toString())
      core.warning(
        'lock file exists, but cannot be decoded - setting locked to false'
      )
      core.setOutput('locked', 'false')
      return false
    }

    // If the lock file exists, and can be decoded, return true
    // Set locked to true if the lock file exists
    core.info(FOUND_LOCK)
    core.setOutput('locked', 'true')

    if (Object.prototype.hasOwnProperty.call(lockData, 'branch')) {
      core.setOutput('branch', lockData['branch'])
    }

    return true
  } catch (error) {
    // If the lock file doesn't exist, return false
    if (error.status === 404) {
      core.info(NO_LOCK)
      core.setOutput('locked', 'false')
      return false
    }

    // If some other error occurred, throw it
    throw new Error(error)
  }
}
