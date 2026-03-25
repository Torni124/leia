const fs = require("node:fs");
const path = require("node:path");

const extensionRoot = path.resolve(__dirname, "..");
const languageServerDist = path.resolve(
  extensionRoot,
  "..",
  "leia-language-server",
  "dist"
);
const bundledServerDist = path.join(extensionRoot, "server-dist");

if (!fs.existsSync(languageServerDist)) {
  console.error(
    `Expected a built language server at ${languageServerDist}. Run "npm --prefix ../leia-language-server run build" first.`
  );
  process.exit(1);
}

fs.rmSync(bundledServerDist, { recursive: true, force: true });
copyDirectory(languageServerDist, bundledServerDist);

console.log(`Synced Leia language server into ${bundledServerDist}`);

function copyDirectory(sourceDir, destinationDir) {
  fs.mkdirSync(destinationDir, { recursive: true });

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const destinationPath = path.join(destinationDir, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, destinationPath);
      continue;
    }

    fs.copyFileSync(sourcePath, destinationPath);
  }
}
