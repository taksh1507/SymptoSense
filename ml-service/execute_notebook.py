"""Execute and save the submitted notebook using the current project interpreter."""
from pathlib import Path
import sys
import nbformat
from nbclient import NotebookClient
from jupyter_client import AsyncKernelManager
from jupyter_core.utils import run_sync

service = Path(__file__).resolve().parent
path = service / 'notebooks' / 'SymptoSense_ML.ipynb'
notebook = nbformat.read(path, as_version=4)
manager = AsyncKernelManager(kernel_name='python3')
manager.kernel_spec.argv = [sys.executable, '-m', 'ipykernel_launcher', '-f', '{connection_file}']
client = NotebookClient(notebook, km=manager, timeout=180, resources={'metadata': {'path': str(service)}})
try:
    client.execute()
finally:
    run_sync(manager.shutdown_kernel)(now=True)
nbformat.validate(notebook)
nbformat.write(notebook, path)
print('PASS: executed and validated', len(notebook.cells), 'notebook cells')
