import json
import sys
import unittest
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent

if str(TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(TESTS_DIR))

from support import load_candidate_module, temporary_work_dir


FIXTURES_DIR = Path(__file__).resolve().parents[1] / "fixtures"


class BehaviorTests(unittest.TestCase):
    def setUp(self) -> None:
        self.module = load_candidate_module()

    def test_missing_input_returns_non_zero(self) -> None:
        with temporary_work_dir() as temp_dir:
            output_path = temp_dir / "report.json"

            exit_code = self.module.generate_report("missing.json", str(output_path))

            self.assertNotEqual(exit_code, 0)
            self.assertFalse(output_path.exists())

    def test_invalid_record_returns_non_zero(self) -> None:
        with temporary_work_dir() as temp_dir:
            source_path = FIXTURES_DIR / "invalid-records.json"
            output_path = temp_dir / "report.json"

            exit_code = self.module.generate_report(str(source_path), str(output_path))

            self.assertNotEqual(exit_code, 0)
            self.assertFalse(output_path.exists())

    def test_default_excludes_inactive_records(self) -> None:
        with temporary_work_dir() as temp_dir:
            source_path = FIXTURES_DIR / "records.json"
            output_path = temp_dir / "report.json"

            exit_code = self.module.generate_report(str(source_path), str(output_path))

            self.assertEqual(exit_code, 0)
            report = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(report["total_records"], 3)
            self.assertEqual(report["included_records"], 2)
            self.assertEqual(report["status_counts"], {"active": 1, "pending": 1})
            self.assertEqual([record["id"] for record in report["records"]], ["u1", "u3"])

    def test_include_inactive_includes_all_records(self) -> None:
        with temporary_work_dir() as temp_dir:
            source_path = FIXTURES_DIR / "records.json"
            output_path = temp_dir / "report.json"

            exit_code = self.module.generate_report(
                str(source_path),
                str(output_path),
                include_inactive=True
            )

            self.assertEqual(exit_code, 0)
            report = json.loads(output_path.read_text(encoding="utf-8"))
            self.assertEqual(report["total_records"], 3)
            self.assertEqual(report["included_records"], 3)
            self.assertEqual(
                report["status_counts"],
                {"active": 1, "inactive": 1, "pending": 1}
            )
            self.assertEqual([record["id"] for record in report["records"]], ["u1", "u2", "u3"])


if __name__ == "__main__":
    unittest.main()
