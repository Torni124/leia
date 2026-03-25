import sys
import unittest
from pathlib import Path

TESTS_DIR = Path(__file__).resolve().parent

if str(TESTS_DIR) not in sys.path:
    sys.path.insert(0, str(TESTS_DIR))

from support import get_candidate_path, load_candidate_module


class ContractTests(unittest.TestCase):
    def test_candidate_file_exists(self) -> None:
        self.assertTrue(get_candidate_path().exists())

    def test_generate_report_function_exists(self) -> None:
        module = load_candidate_module()
        self.assertTrue(hasattr(module, "generate_report"))
        self.assertTrue(callable(module.generate_report))

    def test_main_function_exists(self) -> None:
        module = load_candidate_module()
        self.assertTrue(hasattr(module, "main"))
        self.assertTrue(callable(module.main))


if __name__ == "__main__":
    unittest.main()
