import importlib.util
import os
import shutil
from contextlib import contextmanager
from pathlib import Path
from uuid import uuid4


HARNESS_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CANDIDATE = HARNESS_ROOT / "candidate" / "script_under_test.py"
WORK_ROOT = HARNESS_ROOT / ".tmp"


def get_candidate_path() -> Path:
    override = os.environ.get("LEIA_PYTHON_CANDIDATE")
    return Path(override).resolve() if override else DEFAULT_CANDIDATE


def load_candidate_module():
    candidate_path = get_candidate_path()

    if not candidate_path.exists():
        raise FileNotFoundError(
            f"Candidate script not found at {candidate_path}. "
            "Set LEIA_PYTHON_CANDIDATE or place your file at the default path."
        )

    spec = importlib.util.spec_from_file_location("leia_candidate", candidate_path)

    if spec is None or spec.loader is None:
        raise RuntimeError(f"Unable to load candidate module from {candidate_path}.")

    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


@contextmanager
def temporary_work_dir():
    WORK_ROOT.mkdir(parents=True, exist_ok=True)
    path = WORK_ROOT / f"run-{uuid4().hex}"
    path.mkdir(parents=True, exist_ok=True)

    try:
        yield path
    finally:
        shutil.rmtree(path, ignore_errors=True)
