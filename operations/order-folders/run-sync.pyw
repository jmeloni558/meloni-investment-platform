"""Run the OneDrive worker from Task Scheduler without allocating a console."""
import os
import subprocess
import sys
from pathlib import Path

script = Path(__file__).with_name("sync.ps1")
powershell = Path(os.environ["SystemRoot"]) / "System32/WindowsPowerShell/v1.0/powershell.exe"
result = subprocess.run([str(powershell), "-NoProfile", "-NonInteractive", "-ExecutionPolicy",
                         "Bypass", "-File", str(script)], creationflags=subprocess.CREATE_NO_WINDOW,
                        stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
sys.exit(result.returncode)
