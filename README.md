# Github Check Env CLI

A CLI tool to check for environment variables in a project and verify their existence in GitHub secrets.

## Installation

You can install the CLI tool globally from npm:

```bash
npm install -g gh-check-env-cli
```

Alternatively, you can install it as a dev dependency in your project:

```bash
npm install --save-dev gh-check-env-cli
```

## Usage

Once installed, you can run the `check-env` command from your terminal.

### As a global package

```bash
gh-check-env [options]
```

### As a project dependency

You can add it to your `package.json` scripts:

```json
"scripts": {
  "gh-check-env": "gh-check-env --repo your-repo --owner your-owner"
}
```

Then run it with:

```bash
npm run gh-check-env
```

### Options

-   `--repo`, `-r`: Repository name (required)
-   `--owner`, `-o`: Repository owner (required)
-   `--dir`, `-d`: Directory to scan (default: ".")
-   `--token`, `-t`: GitHub token (can also be set with `GHCR_TOKEN` environment variable)

### Example

```bash
gh-check-env --repo my-repo --owner my-username --token your-github-token
```

This will scan the current directory for environment variables, check them against the secrets in the specified GitHub repository, and log the results to the console.