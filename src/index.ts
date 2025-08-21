#!/usr/bin/env node
import * as fs from "fs";
import * as path from "path";
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import * as dotenv from "dotenv";

dotenv.config();

const getProjectFiles = (dir: string, fileList: string[] = []): string[] => {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getProjectFiles(fullPath, fileList);
    } else if (fullPath.endsWith(".ts")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
};

const getWorkflowFiles = (dir: string, fileList: string[] = []): string[] => {
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    if (fs.statSync(fullPath).isDirectory()) {
      getWorkflowFiles(fullPath, fileList);
    } else if (fullPath.endsWith(".yml") || fullPath.endsWith(".yaml")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
};

const main = async () => {
  const argv = await yargs(hideBin(process.argv))
    .option("repo", {
      alias: "r",
      description: "Repository name",
      type: "string",
      demandOption: true,
    })
    .option("owner", {
      alias: "o",
      description: "Repository owner",
      type: "string",
      demandOption: true,
    })
    .option("dir", {
      alias: "d",
      description: "Directory to scan",
      type: "string",
      default: ".",
    })
    .option("token", {
      alias: "t",
      description: "GitHub token",
      type: "string",
    }).argv;

  const { repo, owner, dir, token } = argv;
  const projectRoot = path.resolve(dir);
  const srcDir = path.join(projectRoot, "src");

  console.log(`Scanning project files in ${srcDir}...`);
  const projectFiles = getProjectFiles(srcDir);
  const envVars = new Set<string>();
  const envVarRegex = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

  for (const file of projectFiles) {
    const content = fs.readFileSync(file, "utf-8");
    let match;
    while ((match = envVarRegex.exec(content)) !== null) {
      envVars.add(match[1]);
    }
  }
  const usedEnvVars = Array.from(envVars);
  console.log("Found environment variables in the project:", usedEnvVars);

  const workflowDir = path.join(projectRoot, ".github", "workflows");
  if (!fs.existsSync(workflowDir)) {
    console.log("No .github/workflows directory found. Skipping secret check.");
    return;
  }

  const workflowFiles = getWorkflowFiles(workflowDir);
  const workflowSecrets = new Set<string>();
  const secretRegex = /secrets\.([A-Z_][A-Z0-9_]*)/g;

  for (const file of workflowFiles) {
    const workflowContent = fs.readFileSync(file, "utf-8");
    let secretMatch;
    while ((secretMatch = secretRegex.exec(workflowContent)) !== null) {
      workflowSecrets.add(secretMatch[1]);
    }
  }
  const workflowSecretsArray = Array.from(workflowSecrets);
  console.log("\nFound secrets in GitHub workflows:", workflowSecretsArray);

  console.log("\nChecking for variables in GitHub secrets via REST API...");
  const githubToken = token || process.env.GHCR_TOKEN;
  if (!githubToken) {
    console.error(
      "Error: GitHub token not provided. Set it via the --token flag or the GHCR_TOKEN environment variable."
    );
    process.exit(1);
  }

  const headers = {
    Authorization: `token ${githubToken}`,
    Accept: "application/vnd.github.v3+json",
  };

  for (const envVar of usedEnvVars) {
    if (workflowSecrets.has(envVar)) {
      const url = `https://api.github.com/repos/${owner}/${repo}/actions/secrets/${envVar}`;
      try {
        const response = await fetch(url, { headers });
        if (response.status === 200) {
          console.log(`✅ ${envVar} found in GitHub secrets.`);
        } else if (response.status === 404) {
          console.log(
            `❌ ${envVar} not found in GitHub secrets, but is in a workflow file.`
          );
        } else {
          console.error(
            `Error checking secret ${envVar}: Received status ${response.status}`
          );
        }
      } catch (error: any) {
        console.error(`Error checking secret ${envVar}:`, error.message);
      }
    } else {
      console.log(`⚠️ ${envVar} not found in any workflow file.`);
    }
  }
};

main().catch((error) => {
  console.error("Error during script execution:", error);
  process.exit(1);
});
