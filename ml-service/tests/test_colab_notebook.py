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

    # 2. Check structure: First cell markdown (title/intro), then alternating pairs of (markdown, code)
    assert nb.cells[0].cell_type == "markdown", "First cell must be intro markdown"
    for i in range(1, len(nb.cells), 2):
        assert nb.cells[i].cell_type == "markdown", f"Cell {i} must be an explanatory markdown cell"
        assert nb.cells[i+1].cell_type == "code", f"Cell {i+1} must be a code cell preceded by markdown"

    code_cells = [c for c in nb.cells if c.cell_type == "code"]
    assert len(code_cells) == 11, f"Expected exactly 11 code cells, found {len(code_cells)}"

    # 3. Assert all code cell outputs are cleared
    for i, cell in enumerate(code_cells):
        assert len(cell.outputs) == 0, f"Code cell {i+1} has uncleared outputs"
        assert cell.execution_count is None, f"Code cell {i+1} has execution_count set"

    # 4. Assert all Python code cells parse cleanly with ast.parse
    for i, cell in enumerate(code_cells):
        code = cell.source
        # Strip Jupyter/Colab shell magic lines (!pip, !git, %cd, etc.) for ast parsing
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

    # 5. Verify key workflow steps and constraints exist
    all_text = "\n".join(c.source for c in nb.cells)
    assert "20043374" in all_text, "Figshare Article ID 20043374 must be referenced"
    assert "api.figshare.com" in all_text, "Figshare API must be queried"
    assert "SOURCE.md" in all_text, "SHA-256 hashes must be parsed from SOURCE.md"
    assert "train_pipeline.py" in all_text, "Must invoke train_pipeline.py"
    assert "parse_symcat_801.py" in all_text, "Must invoke parse_symcat_801.py"
    assert "train_clinical.py" in all_text, "Must invoke train_clinical.py"
    assert "symcat_knowledge_base.json" in all_text, "Must reference SymCat Knowledge Base"
    assert "to_sparse" in all_text, "Must use to_sparse for inference"
    assert "predict_proba" in all_text, "Must evaluate predict_proba"
    assert "symptosense_artifacts.zip" in all_text, "Must package artifacts into symptosense_artifacts.zip"
    assert "manifest.json" in all_text, "Must generate manifest.json"
    assert "pytest" in all_text, "Must run pytest"
