"""Validation script for SymptoSense Google Colab Training Notebook."""
import ast
import json
import re
from pathlib import Path
import nbformat

def validate_all():
    repo_root = Path(__file__).resolve().parents[1]
    nb_path = repo_root / "ml-service" / "notebooks" / "SymptoSense_Colab_Training.ipynb"

    print("=== [1] Validating nbformat ===")
    assert nb_path.exists(), f"Notebook missing: {nb_path}"
    nb = nbformat.read(str(nb_path), as_version=4)
    nbformat.validate(nb)
    print("[OK] nbformat.validate passed successfully.")

    print("\n=== [2] Validating AST syntax on code cells ===")
    code_cells = [c for c in nb.cells if c.cell_type == "code"]
    print(f"Found {len(code_cells)} code cells across {len(nb.cells)} total cells.")
    for idx, cell in enumerate(code_cells):
        cleaned_lines = []
        for line in cell.source.splitlines():
            s = line.strip()
            if s.startswith("!") or s.startswith("%"):
                cleaned_lines.append(f"# {line}")
            else:
                cleaned_lines.append(line)
        cleaned_code = "\n".join(cleaned_lines)
        try:
            ast.parse(cleaned_code)
            print(f"  [OK] Cell {idx+1}: ast.parse OK")
        except SyntaxError as e:
            raise SyntaxError(f"AST parse error in code cell {idx+1}: {e}\n{cleaned_code}")

    print("\n=== [3] Verifying file paths referenced in notebook ===")
    checked_paths = [
        "ml-service/requirements.txt",
        "ml-service/data/ddxplus/SOURCE.md",
        "ml-service/data/ddxplus",
        "ml-service/train_pipeline.py",
        "ml-service/reports/ml_report.json",
        "ml-service/reports/figures",
        "ml-service/artifacts",
        "ml-service/artifacts/best_model.joblib",
        "ml-service/artifacts/label_encoder.joblib",
        "ml-service/artifacts/feature_columns.json",
        "lib/ml/symptom-list.json",
        "ml-service/parse_symcat_801.py",
        "ml-service/train_clinical.py",
        "ml-service/data/symcat/symcat-801-diseases.csv",
        "ml-service/data/symcat/symcat-474-symptoms.csv",
        "ml-service/artifacts/clinical/symcat_knowledge_base.json",
        "ml-service/tests"
    ]
    for p_str in checked_paths:
        p = repo_root / p_str
        assert p.exists(), f"Referenced path does not exist in repo: {p_str}"
        print(f"  [OK] Path exists: {p_str}")

    print("\n=== [4] Verifying CLI flags in train_pipeline.py ===")
    pipeline_code = (repo_root / "ml-service" / "train_pipeline.py").read_text(encoding="utf-8")
    flags = ["--train-rows", "--realistic", "--no-realistic", "--aug-copies"]
    for flag in flags:
        assert flag in pipeline_code, f"CLI flag {flag} not found in train_pipeline.py!"
        print(f"  [OK] Flag exists in train_pipeline.py: {flag}")

    print("\n=== [5] Verifying DDX_XGB_DEVICE usage in ml-service/ ===")
    ddx_training_code = (repo_root / "ml-service" / "ml_pipeline" / "ddx_training.py").read_text(encoding="utf-8")
    assert "DDX_XGB_DEVICE" in ddx_training_code, "DDX_XGB_DEVICE not found in ddx_training.py"
    print("  [OK] DDX_XGB_DEVICE read confirmed in ml-service/ml_pipeline/ddx_training.py")

    print("\n=== [6] Full Training Execution Status ===")
    ddx_data_files = [
        "release_train_patients",
        "release_validate_patients",
        "release_test_patients",
        "release_conditions.json",
        "release_evidences.json"
    ]
    all_present = all((repo_root / "ml-service" / "data" / "ddxplus" / f).exists() for f in ddx_data_files)
    if all_present:
        print("  [OK] DDXPlus data files are present locally.")
        print("  Full 150k-row training execution: not executed in this turn (preserving checked-in model artifacts and reports per rule).")
    else:
        print("  DDXPlus patient data files not present: not executed.")

    print("\nALL NOTEBOOK VALIDATION CHECKS PASSED.")

if __name__ == '__main__':
    validate_all()
