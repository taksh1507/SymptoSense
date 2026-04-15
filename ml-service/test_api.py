import requests
import json

BASE_URL = "http://localhost:8000"

def test_prediction():
    payload = {
        "age_group": 1,
        "severity": 2,
        "duration": 2,
        "fever": 1,
        "cough": 1,
        "chest_pain": 0,
        "dizziness": 0,
        "fatigue": 0,
        "diabetes": 0,
        "heart_disease": 0,
        "rule_score": 45,
        "risk_level": 1,
        
        # New Dynamic Features
        "symptom_intensity_score": 2.5,
        "symptom_consistency_score": 0.6,
        "symptom_progression": 2.0, # Worsening
        "answer_confidence_proxy": 0.5,
        "ambiguity_score": 0.8, # Very ambiguous
        "multi_symptom_density": 0.25
    }
    
    print(f"Testing Prediction with high ambiguity...")
    try:
        response = requests.post(f"{BASE_URL}/predict-confidence", json=payload)
        if response.status_code == 200:
            print("Response:", json.dumps(response.json(), indent=2))
        else:
            print(f"Error {response.status_code}: {response.text}")
    except Exception as e:
        print(f"Failed to connect: {e}")

if __name__ == "__main__":
    test_prediction()
