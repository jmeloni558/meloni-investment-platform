"""A retry receives the prior failure without losing successful files."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from types import SimpleNamespace

spec = importlib.util.spec_from_file_location("bpo_reports", Path(__file__).parents[1] / "operations/order-folders/bpo_reports.py")
reports = importlib.util.module_from_spec(spec)
spec.loader.exec_module(reports)


class RetryTests(unittest.TestCase):
    def test_retry_carries_diagnostics_and_preserves_files(self):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            request = folder / "request.json"
            status = folder / "status.txt"
            saved = folder / "saved.pdf"
            saved.write_bytes(b"already downloaded")
            status.write_text("Browser connection unavailable.")
            prompts = []

            def attempt(args, **kwargs):
                prompts.append(json.loads(kwargs["input"].decode()[len(reports.PROMPT):]))
                Path(args[args.index("-o") + 1]).write_text("Missing RPR; MLS and iMapp saved.")
                return SimpleNamespace(returncode=0)

            with patch.object(reports.shutil, "which", return_value="codex.exe"), patch.object(reports.subprocess, "run", side_effect=attempt):
                reports.run_attempts({"folder": str(folder)}, request, status)
            self.assertEqual(prompts[0]["previous_attempt_status"], "Browser connection unavailable.")
            self.assertEqual(prompts[1]["previous_attempt_status"], "Missing RPR; MLS and iMapp saved.")
            self.assertEqual(saved.read_bytes(), b"already downloaded")
            self.assertFalse(reports.verified(status.read_text(), folder))


if __name__ == "__main__":
    unittest.main()
