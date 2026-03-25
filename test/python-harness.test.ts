import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

function resolvePythonExecutable(): string {
  const candidates = [
    process.env.PYTHON,
    "C:\\Program Files\\Python313\\python.exe",
    "C:\\Program Files\\Python312\\python.exe",
    "python"
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of candidates) {
    if (candidate === "python" || existsSync(candidate)) {
      return candidate;
    }
  }

  return "python";
}

test("python harness passes against the bundled sample candidate", (t) => {
  const repoRoot = resolve(__dirname, "..", "..");
  const testsDir = resolve(repoRoot, "python_eval", "generate_json_report", "tests");
  const candidatePath = resolve(
    repoRoot,
    "python_eval",
    "generate_json_report",
    "candidate",
    "script_under_test.py"
  );
  const pythonExecutable = resolvePythonExecutable();

  const result = spawnSync(
    pythonExecutable,
    ["-m", "unittest", "discover", "-s", testsDir, "-p", "test_*.py"],
    {
      cwd: repoRoot,
      encoding: "utf8",
      env: {
        ...process.env,
        LEIA_PYTHON_CANDIDATE: candidatePath
      }
    }
  );

  if (result.error) {
    const errorWithCode = result.error as NodeJS.ErrnoException;

    if (errorWithCode.code === "EPERM" || errorWithCode.code === "ENOENT") {
      t.skip(`Python spawn is unavailable in this environment: ${result.error.message}`);
      return;
    }

    assert.fail(result.error.message);
  }

  const combinedOutput = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  assert.equal(result.status, 0, combinedOutput);
});
