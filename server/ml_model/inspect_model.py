import joblib
import pickle
import traceback
import os
import sys

# Add current directory to path just in case
sys.path.append(os.getcwd())

files = ['model/model_random_forest.pkl', 'model/model_decision_tree.pkl', 'model/model_naive_bayes.pkl', 'model/model_svm.pkl']

for f in files:
    print(f"--- Attempting to load {f} ---")
    if not os.path.exists(f):
        print(f"File {f} does not exist.")
        continue
        
    try:
        model = joblib.load(f)
        print(f"Success loading {f} with joblib!")
        print(f"Type: {type(model)}")
        
        if hasattr(model, 'feature_names_in_'):
            print(f"Found feature names in {f}!")
            joblib.dump(model.feature_names_in_, 'symptoms_list.pkl')
            joblib.dump(model, 'disease_model.pkl')
            print("Saved disease_model.pkl and symptoms_list.pkl")
            sys.exit(0)
        else:
            print(f"No feature_names_in_ attribute in {f}")
            if hasattr(model, 'n_features_in_'):
                print(f"n_features_in_: {model.n_features_in_}")
                
    except Exception:
        print(f"Failed with joblib. Traceback:")
        traceback.print_exc()
        
    print("\n")
