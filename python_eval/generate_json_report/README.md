# Python Harness: Generate JSON Report

This folder gives you a concrete evaluation target for Python code generated from [examples/generate-json-report.leia](/C:/Users/tbodi/leia/examples/generate-json-report.leia).

## How To Use It

1. Put the generated Python file at:

   [python_eval/generate_json_report/candidate/script_under_test.py](/C:/Users/tbodi/leia/python_eval/generate_json_report/candidate/script_under_test.py)

2. Run the Python harness directly:

   ```powershell
   npm run test:python-harness
   ```

   To generate a complete model-ready handoff file from the Leia spec first:

   ```powershell
   leia handoff examples\generate-json-report.leia
   ```

   Or run the full suite:

   ```powershell
   npm test
   ```

## Required Contract

The candidate script is expected to:

- export `generate_report(source_path: str, output_path: str, include_inactive: bool = False) -> int`
- support CLI execution as:

  ```powershell
  python script_under_test.py <sourcePath> <outputPath> [--include-inactive]
  ```

- read a JSON array of records
- write a JSON report with:
  - `total_records`
  - `included_records`
  - `status_counts`
  - `records`

## Notes

- The included candidate file is a passing sample implementation.
- You can replace it with model output and rerun the tests.
- If you want to test a file in a different location, set `LEIA_PYTHON_CANDIDATE` before running the tests.
