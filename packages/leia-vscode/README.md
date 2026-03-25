# Leia VS Code Extension

This package contains the installable VS Code extension for Leia.

Its responsibilities are:

- associate `.leia` files with the Leia language
- provide basic syntax highlighting
- launch the bundled Leia language server

The extension does not implement parsing or validation rules itself.

## Local Development

1. Install dependencies:

   ```bash
   cd packages/leia-language-server
   npm install

   cd ../leia-vscode
   npm install
   ```

2. Build the extension:

   ```bash
   cd packages/leia-vscode
   npm run build
   ```

   That command also builds the language server and copies its compiled output into `server-dist/`, which is the layout used for packaged installs.

3. Open `packages/leia-vscode` in VS Code and press `F5`.

4. In the Extension Development Host, open a `.leia` file to see diagnostics and formatting support.

## Package A VSIX

Build a locally installable extension package:

```bash
cd packages/leia-vscode
npm run package:vsix
```

That produces a `.vsix` file in this folder. Install it into your regular VS Code with:

```bash
code --install-extension leia-language-0.1.0.vsix
```

## Publish Later

This package is set up to be publishable, but you still need to replace the placeholder `publisher` value in `package.json` with your real Marketplace publisher before doing a public release.
