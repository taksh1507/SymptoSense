# Public dataset provenance

Downloaded directly from https://www.kaggle.com/datasets/itachi9604/disease-symptom-description-dataset using the public Kaggle download endpoint on 2026-10-13. Original CSV files are retained unchanged. The dataset page calls this Disease Symptom Prediction. Disease labels come from its Disease column, not a generated feature formula.

The download contains symptom slots, a symptom severity table, descriptions and precautions. Empty symptom slots mean no extra listed symptom. Repeated symptom patterns are removed before splitting. These are public symptom-disease associations; neither the uploader nor this project establishes independent patient diagnoses or external clinical validation. Urgency labels are explicitly derived proxies using training-only disease averages of supplied symptom weights. Official Kaggle metadata reports CC BY-SA 4.0. Attribution: dataset uploader itachi9604 (created with Pratik Rathod), Kaggle source linked above. Preserve attribution and applicable share-alike terms when redistributing adaptations. `kaggle-metadata.json` records the fetched source description and license. The uploader describes the data as reference/training material and cautions that actual data may vary.


Severity cleaning: the source spells `foul_smell_ofurine` differently from the main symptom file; that explicit alias is mapped. It also lists `fluid_overload` twice with weights 6 and 4. The pipeline uses their mean (5) and records the conflicting entries and this policy in ml_report.json. Disease labels are unaffected.
