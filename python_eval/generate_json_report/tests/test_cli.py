import json
import subprocess
import sys
import unittest
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent

if str(TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(TESTS_DIR))

from support import get_candidate_path, temporary_work_dir


FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"


class CliTests(unittest.TestCase):
    def test_cli_generates_report(self) -> None:
        with temporary_work_dir() as temp_dir:
            source_path = FIXTURES_DIR / "records.json"
            output_path = temp_dir / "report.json"

            completed = subprocess.run(
                [sys.executable, str(get_candidate_path()), str(source_path), str(output_path)],
                capture_output=True,
                text=True,
                check=False
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            report = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(report["included_records"], 2)

    def test_cli_include_inactive_flag(self) -> None:
        with temporary_work_dir() as temp_dir:
            source_path = FIXTURES_DIR / "records.json"
            output_path = temp_dir / "report.json"

            completed = subprocess.run(
                [
                    sys.executable,
                    str(get_candidate_path()),
                    str(source_path),
                    str(output_path),
                    "--include-inactive"
                ],
                capture_output=True,
                text=True,
                check=False
            )

            self.assertEqual(completed.returncode, 0, completed.stderr)
            report = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(report["included_records"], 3)


if __name__ == "__main__":
    unittest.main()
