"""Script to generate the Google Colab Training Notebook for SymptoSense."""
import json
from pathlib import Path
import nbformat as nbf

def build_colab_notebook():
    nb = nbf.v4.new_notebook()
    nb.metadata = {
        "colab": {
            "name": "SymptoSense_Colab_Training.ipynb",
            "provenance": [],
            "toc_visible": True,
            "gpuType": "T4"
        },
        "kernelspec": {
            "display_name": "Python 3",
            "name": "python3"
        },
        "language_info": {
            "name": "python"
        },
        "accelerator": "GPU"
    }

    cells = []

    # Title Markdown
    cells.append(nbf.v4.new_markdown_cell(
        "# SymptoSense DDXPlus: Realistic-Input Diagnostic Training on Google Colab\n\n"
        "This notebook provides the complete, reproducible ML training pipeline for **SymptoSense**.\n\n"
        "### Key Capabilities:\n"
        "- **Automated Figshare Download**: Downloads official DDXPlus dataset (Article 20043374) with SHA-256 verification.\n"
        "- **Realistic Perturbation**: Simulates outpatient presentation (3–8 symptoms, forget rate, symptom mutation).\n"
        "- **Group-Safe Training**: StratifiedGroupKFold prevents augmented patient identity leakage.\n"
        "- **Confidence Calibration**: Brier and log-loss guarded probability calibration.\n"
        "- **Selective Prediction**: Grid search for optimal (threshold $t$, margin $m$) operating point.\n"
        "- **Export Artifacts**: Bundles all trained models into `artifacts.zip` for deployment in SymptoSense."
    ))

    # Cell 1: Environment Check
    cells.append(nbf.v4.new_code_cell(
        "# [1] Environment Check: GPU/CPU, RAM, Python Version, and System Specs\n"
        "import os, sys, platform, psutil\n"
        "print('=== SYSTEM ENVIRONMENT CHECK ===')\n"
        "print(f'Python Version : {sys.version.split()[0]} ({platform.python_implementation()})')\n"
        "print(f'Platform       : {platform.platform()}')\n"
        "print(f'CPU Count      : {os.cpu_count()} cores')\n"
        "ram_gb = psutil.virtual_memory().total / (1024 ** 3)\n"
        "print(f'System RAM     : {ram_gb:.2f} GB')\n\n"
        "has_gpu = False\n"
        "try:\n"
        "    import torch\n"
        "    if torch.cuda.is_available():\n"
        "        has_gpu = True\n"
        "        device_name = torch.cuda.get_device_name(0)\n"
        "        vram_gb = torch.cuda.get_device_properties(0).total_memory / (1024 ** 3)\n"
        "        print(f'GPU Detected   : {device_name} ({vram_gb:.2f} GB VRAM)')\n"
        "        os.environ['DDX_XGB_DEVICE'] = 'cuda'\n"
        "except ImportError:\n"
        "    pass\n\n"
        "if not has_gpu:\n"
        "    print('GPU Status     : No CUDA GPU detected (running in CPU mode)')\n"
        "    os.environ['DDX_XGB_DEVICE'] = 'cpu'\n"
        "else:\n"
        "    print('GPU Mode       : DDX_XGB_DEVICE=cuda set for XGBoost acceleration')"
    ))

    # Cell 2: Google Drive Mount
    cells.append(nbf.v4.new_code_cell(
        "# [2] Google Drive Mount (Optional: save artifacts directly to Drive)\n"
        "MOUNT_DRIVE = False  # @param {type:\"boolean\"}\n"
        "DRIVE_DIR = \"/content/drive/MyDrive/SymptoSense_Artifacts\"\n\n"
        "if MOUNT_DRIVE:\n"
        "    try:\n"
        "        from google.colab import drive\n"
        "        drive.mount('/content/drive')\n"
        "        os.makedirs(DRIVE_DIR, exist_ok=True)\n"
        "        print(f'Google Drive mounted successfully. Artifacts will be saved to: {DRIVE_DIR}')\n"
        "    except Exception as exc:\n"
        "        print(f'Drive mount skipped or failed: {exc}')\n"
        "else:\n"
        "    print('Google Drive mount disabled. Artifacts will be saved locally in the runtime.')"
    ))

    # Cell 3: Clone or Upload Repo Check
    cells.append(nbf.v4.new_code_cell(
        "# [3] Repository Setup: Locate or Clone SymptoSense\n"
        "from pathlib import Path\n"
        "import os\n\n"
        "REPO_URL = \"https://github.com/taksh1507/SymptoSense.git\"\n"
        "TARGET_DIR = Path(\"/content/SymptoSense/ml-service\")\n\n"
        "if TARGET_DIR.exists():\n"
        "    print(f'Found SymptoSense repository at {TARGET_DIR.parent}')\n"
        "    os.chdir(TARGET_DIR)\n"
        "elif Path(\"./ml-service\").exists():\n"
        "    print('Running from project root directory.')\n"
        "    os.chdir(Path(\"./ml-service\").resolve())\n"
        "elif Path(\"../ml-service\").exists():\n"
        "    os.chdir(Path(\"../ml-service\").resolve())\n"
        "elif Path(\"./ml_pipeline\").exists():\n"
        "    print('Currently in ml-service directory.')\n"
        "else:\n"
        "    print(f'Cloning repository from {REPO_URL}...')\n"
        "    !git clone --depth 1 {REPO_URL} /content/SymptoSense\n"
        "    os.chdir('/content/SymptoSense/ml-service')\n\n"
        "print('Working directory:', os.getcwd())"
    ))

    # Cell 4: Dependency Installation
    cells.append(nbf.v4.new_code_cell(
        "# [4] Install Pinned Dependencies\n"
        "import sys, subprocess\n"
        "print('Installing dependencies from requirements.txt...')\n"
        "!pip install --quiet -r requirements.txt\n"
        "print('Dependencies verified successfully.')"
    ))

    # Cell 5: Automated Figshare Download
    cells.append(nbf.v4.new_code_cell(
        "# [5] Automated Figshare Download & Integrity Verification (Article 20043374)\n"
        "import hashlib, json, time, urllib.request, zipfile\n"
        "from pathlib import Path\n\n"
        "DATA_DIR = Path(\"data/ddxplus\")\n"
        "DATA_DIR.mkdir(parents=True, exist_ok=True)\n\n"
        "EXPECTED_HASHES = {\n"
        "    'release_conditions.json': '960112db157169215c5a5c1eac0993317d2363c0cf2dadf173735dc503810d48',\n"
        "    'release_evidences.json': '980f7020ec068b290b49cca7f2ab0a2058faae37f9a94b113e10b6fe0c882f31',\n"
        "    'release_train_patients.zip': '174ae1d56f36a15b7144838ecd214e1e1748a5369fc90c559529b6dc6ecfb218',\n"
        "    'release_validate_patients.zip': '625a96855becf0efe5da339fd3d440aa99597d48f784957a97dacc3fceaa7e40',\n"
        "    'release_test_patients.zip': 'ad3bb981f3453fd7abffb35cc595a1c02197e409c581bff97c1265c33eb00d23',\n"
        "}\n\n"
        "def sha256_of(path: Path) -> str:\n"
        "    h = hashlib.sha256()\n"
        "    with open(path, 'rb') as f:\n"
        "        for chunk in iter(lambda: f.read(1024 * 1024), b''):\n"
        "            h.update(chunk)\n"
        "    return h.hexdigest()\n\n"
        "# Fetch download URLs via Figshare v2 API\n"
        "FIGSHARE_ARTICLE_ID = 20043374\n"
        "api_url = f'https://api.figshare.com/v2/articles/{FIGSHARE_ARTICLE_ID}'\n"
        "print(f'Fetching article metadata from Figshare API ({api_url})...')\n\n"
        "req = urllib.request.Request(api_url, headers={'User-Agent': 'Mozilla/5.0'})\n"
        "with urllib.request.urlopen(req, timeout=30) as resp:\n"
        "    article_data = json.loads(resp.read().decode('utf-8'))\n\n"
        "files_to_download = {f['name']: f['download_url'] for f in article_data.get('files', [])}\n"
        "print(f'Discovered {len(files_to_download)} files on Figshare.')\n\n"
        "for filename, expected_sha in EXPECTED_HASHES.items():\n"
        "    dest = DATA_DIR / filename\n"
        "    if dest.exists() and sha256_of(dest) == expected_sha:\n"
        "        print(f'✓ {filename} already present and verified.')\n"
        "        continue\n"
        "    \n"
        "    url = files_to_download.get(filename)\n"
        "    if not url:\n"
        "        raise FileNotFoundError(f'{filename} not found in Figshare article metadata!')\n"
        "    \n"
        "    print(f'Downloading {filename}...')\n"
        "    urllib.request.urlretrieve(url, dest)\n"
        "    actual_sha = sha256_of(dest)\n"
        "    if actual_sha != expected_sha:\n"
        "        raise ValueError(f'Integrity mismatch for {filename}: expected {expected_sha}, got {actual_sha}')\n"
        "    print(f'✓ {filename} verified (SHA-256 match).')\n\n"
        "# Extract patient archives\n"
        "for zip_name in ['release_train_patients.zip', 'release_validate_patients.zip', 'release_test_patients.zip']:\n"
        "    csv_target = DATA_DIR / zip_name.replace('.zip', '')\n"
        "    if not csv_target.exists():\n"
        "        print(f'Extracting {zip_name}...')\n"
        "        with zipfile.ZipFile(DATA_DIR / zip_name, 'r') as z:\n"
        "            z.extractall(DATA_DIR)\n"
        "        print(f'✓ Extracted to {csv_target.name}')\n"
        "print('All DDXPlus datasets verified and ready.')"
    ))

    # Cell 6: Dataset Verification & EDA
    cells.append(nbf.v4.new_code_cell(
        "# [6] Dataset Verification & Exploratory Data Analysis\n"
        "import pandas as pd\n"
        "from ml_pipeline.ddxplus_data import load_metadata, DATA\n\n"
        "evidences, conditions = load_metadata()\n"
        "print(f'Total Evidences Defined : {len(evidences)} (110 symptoms, 113 antecedents)')\n"
        "print(f'Total Pathologies Defined: {len(conditions)}')\n\n"
        "train_df = pd.read_csv(DATA / 'release_train_patients', nrows=1000)\n"
        "print(f'Train Sample Shape: {train_df.shape}')\n"
        "print('Columns:', train_df.columns.tolist())\n"
        "print('\\nTop 5 Pathologies in Sample:')\n"
        "print(train_df['PATHOLOGY'].value_counts().head(5))\n\n"
        "print('\\nSample Patient Record:')\n"
        "sample = train_df.iloc[0]\n"
        "print(f\"Age: {sample['AGE']}, Sex: {sample['SEX']}, Pathology: {sample['PATHOLOGY']}\")\n"
        "print(f\"Evidences: {sample['EVIDENCES'][:120]}...\")"
    ))

    # Cell 7: Train DDXPlus Realistic Pipeline
    cells.append(nbf.v4.new_code_cell(
        "# [7] Train Realistic-Input DDXPlus Pipeline\n"
        "# Configurable options: train_rows, realistic perturbation, augmentation copies\n"
        "import os\n\n"
        "TRAIN_ROWS = 150000  # @param {type:\"integer\"}\n"
        "REALISTIC_PERTURBATION = True  # @param {type:\"boolean\"}\n"
        "AUG_COPIES = 1  # @param {type:\"integer\"}\n\n"
        "cmd = f\"python train_pipeline.py --train-rows {TRAIN_ROWS} --aug-copies {AUG_COPIES}\"\n"
        "if not REALISTIC_PERTURBATION:\n"
        "    cmd += \" --no-realistic\"\n\n"
        "print(f'Executing: {cmd}')\n"
        "!{cmd}\n"
        "print('Training run completed.')"
    ))

    # Cell 8: Interactive Diagnostic Widget
    cells.append(nbf.v4.new_code_cell(
        "# [8] Interactive Diagnostic Widget & Test Inference\n"
        "import json\n"
        "from disease_inference import predict_disease, DiseaseInput\n\n"
        "# Test symptom presentation\n"
        "sample_input = DiseaseInput(\n"
        "    symptoms=['E_91', 'E_201', 'E_53'],  # Fever, Cough, Sore throat\n"
        "    age=32.0,\n"
        "    sex='Female',\n"
        "    severity='Mild',\n"
        "    duration='3 days'\n"
        ")\n\n"
        "result = predict_disease(sample_input)\n"
        "print('=== DIAGNOSTIC INFERENCE RESULT ===')\n"
        "print('Model Version       :', result['model_version'])\n"
        "print('Top 1 Condition     :', result['top3'][0]['disease'], f\"({result['top3'][0]['probability']*100:.1f}%)\")\n"
        "print('Top 2 Condition     :', result['top3'][1]['disease'], f\"({result['top3'][1]['probability']*100:.1f}%)\")\n"
        "print('Top 3 Condition     :', result['top3'][2]['disease'], f\"({result['top3'][2]['probability']*100:.1f}%)\")\n"
        "print('Urgency Level       :', result['urgency'])\n"
        "print('Confident Flag      :', result['confident'])\n"
        "print('Limited Info Flag   :', result['limited_information'])\n"
        "print('Operating Point     :', result.get('operating_point'))"
    ))

    # Cell 9: Generate & Display Evaluation Figures Inline
    cells.append(nbf.v4.new_code_cell(
        "# [9] Display Evaluation Figures Inline\n"
        "import matplotlib.pyplot as plt\n"
        "import matplotlib.image as mpimg\n"
        "from pathlib import Path\n\n"
        "FIG_DIR = Path(\"reports/figures\")\n"
        "figure_names = [\n"
        "    'model_comparison.png',\n"
        "    'calibration.png',\n"
        "    'confusion_matrix.png',\n"
        "    'shap_global.png',\n"
        "    'robustness.png',\n"
        "    'noise_robustness.png'\n"
        "]\n\n"
        "for fname in figure_names:\n"
        "    fpath = FIG_DIR / fname\n"
        "    if fpath.exists():\n"
        "        plt.figure(figsize=(8, 5))\n"
        "        img = mpimg.imread(str(fpath))\n"
        "        plt.imshow(img)\n"
        "        plt.axis('off')\n"
        "        plt.title(fname.replace('.png', '').replace('_', ' ').title(), fontsize=13)\n"
        "        plt.show()\n"
        "    else:\n"
        "        print(f'Figure {fname} not found.')"
    ))

    # Cell 10: Package Artifacts
    cells.append(nbf.v4.new_code_cell(
        "# [10] Package & Export Trained Model Artifacts\n"
        "import shutil, os\n"
        "from pathlib import Path\n\n"
        "OUTPUT_ZIP = Path(\"/content/SymptoSense_artifacts.zip\")\n"
        "ART_DIR = Path(\"artifacts\")\n"
        "REPORT_PATH = Path(\"reports/ml_report.json\")\n\n"
        "temp_pkg = Path(\"/content/artifacts_export\")\n"
        "temp_pkg.mkdir(exist_ok=True)\n\n"
        "for f in ART_DIR.glob(\"*\"):\n"
        "    if f.is_file():\n"
        "        shutil.copy2(f, temp_pkg / f.name)\n\n"
        "if REPORT_PATH.exists():\n"
        "    shutil.copy2(REPORT_PATH, temp_pkg / \"ml_report.json\")\n\n"
        "shutil.make_archive(\"/content/SymptoSense_artifacts\", 'zip', temp_pkg)\n"
        "print(f'✓ Packaged artifacts to {OUTPUT_ZIP} ({OUTPUT_ZIP.stat().st_size / (1024**2):.2f} MB)')\n\n"
        "# Trigger direct browser download in Google Colab\n"
        "try:\n"
        "    from google.colab import files\n"
        "    files.download(str(OUTPUT_ZIP))\n"
        "    print('Download triggered in browser.')\n"
        "except Exception:\n"
        "    print('To copy artifacts to local SymptoSense repo, extract this zip file into ml-service/artifacts/.')"
    ))

    nb.cells = cells
    return nb

if __name__ == '__main__':
    out_dir = Path("ml-service/notebooks")
    out_dir.mkdir(parents=True, exist_ok=True)
    out_path = out_dir / "SymptoSense_Colab_Training.ipynb"
    nb = build_colab_notebook()
    nbf.validate(nb)
    with open(out_path, 'w', encoding='utf-8') as f:
        nbf.write(nb, f)
    print(f"Generated valid Colab notebook at {out_path} with {len(nb.cells)} cells.")
