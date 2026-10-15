"""Unit tests validating the SymptoSense Google Colab training notebook."""
import ast
import re
from pathlib import Path
import nbformat
import pytest

def test_colab_notebook_structure_and_syntax():
    nb_path = Path(__file__).resolve().parents[1] / "notebooks" / "SymptoSense_Colab_Training.ipynb"
    assert nb_path.exists(), f"Colab notebook missing at {nb_path}"
    
    nb = nbformat.read(str(nb_path), as_version=4)
    # 1. Validate notebook schema
    nbformat.validate(nb)
    
    code_cells = [c for c in nb.cells if c.cell_type == "code"]
    assert len(code_cells) >= 10, f"Expected at least 10 code cells, found {len(code_cells)}"
    
    # 2. Assert all Python code cells parse cleanly with ast.parse
    for i, cell in enumerate(code_cells):
        code = cell.source
        # Strip Jupyter/Colab shell magic lines (!pip, !git, etc.) for ast parsing
        cleaned_lines = []
        for line in code.splitlines():
            stripped = line.strip()
            if stripped.startswith("!") or stripped.startswith("%"):
                cleaned_lines.append(f"# {line}")
            else:
                cleaned_lines.append(line)
        cleaned_code = "\n".join(cleaned_lines)
        try:
            ast.parse(cleaned_code)
        except SyntaxError as exc:
            pytest.fail(f"Syntax error in code cell {i+1}: {exc}\nCode:\n{cleaned_code}")
            
    # 3. Verify key workflow steps exist
    all_text = "\n".join(c.source for c in nb.cells)
    assert "20043374" in all_text, "Figshare Article ID 20043374 must be referenced"
    assert "api.figshare.com" in all_text, "Figshare API must be queried"
    assert "EXPECTED_HASHES" in all_text, "SHA-256 hashes must be verified"
    assert "train_pipeline.py" in all_text, "Must invoke train_pipeline.py"
    assert "predict_disease" in all_text, "Must include diagnostic inference demonstration"
    assert "artifacts.zip" in all_text or "SymptoSense_artifacts" in all_text, "Must package artifacts into zip"
