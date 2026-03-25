import json
import sys
from collections import Counter
from typing import Any, List


def _load_records(source_path: str) -> List[Any]:
    with open(source_path, "r", encoding="utf-8-sig") as source_file:
        data = json.load(source_file)

    if not isinstance(data, list):
        raise ValueError("Input JSON must be an array of records")

    return data


def _validate_record(record: Any) -> None:
    if not isinstance(record, dict):
        raise ValueError("Each record must be an object")

    required_fields = ("id", "name", "status")
    for field in required_fields:
        if field not in record:
            raise ValueError(f"Missing required field: {field}")


def _filter_records(records: List[dict], include_inactive: bool) -> List[dict]:
    if include_inactive:
        return list(records)
    return [record for record in records if record.get("status") != "inactive"]


def _build_report(records: List[dict], included_records: List[dict]) -> dict:
    status_counts = Counter()
    for record in included_records:
        status_counts[str(record["status"])] += 1

    return {
        "total_records": len(records),
        "included_records": len(included_records),
        "status_counts": dict(status_counts),
        "records": included_records,
    }


def generate_report(source_path: str, output_path: str, include_inactive: bool = False) -> int:
    try:
        raw_records = _load_records(source_path)
        validated_records = []
        for record in raw_records:
            _validate_record(record)
            validated_records.append(record)

        included_records = _filter_records(validated_records, include_inactive)
        report = _build_report(validated_records, included_records)

        with open(output_path, "w", encoding="utf-8") as output_file:
            json.dump(report, output_file, indent=2)
            output_file.write("\n")
    except (OSError, json.JSONDecodeError, ValueError, TypeError):
        return 1

    return 0


def _parse_args(argv: List[str]) -> tuple[str, str, bool]:
    if len(argv) not in (3, 4):
        raise ValueError("Usage: python script_under_test.py <sourcePath> <outputPath> [--include-inactive]")

    include_inactive = False
    if len(argv) == 4:
        if argv[3] != "--include-inactive":
            raise ValueError("Usage: python script_under_test.py <sourcePath> <outputPath> [--include-inactive]")
        include_inactive = True

    return argv[1], argv[2], include_inactive


def main(argv: List[str] | None = None) -> int:
    if argv is None:
        argv = sys.argv

    try:
        source_path, output_path, include_inactive = _parse_args(argv)
    except ValueError:
        return 2

    return generate_report(source_path, output_path, include_inactive)


if __name__ == "__main__":
    raise SystemExit(main())
