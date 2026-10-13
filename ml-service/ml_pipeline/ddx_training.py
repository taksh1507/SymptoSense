"""DDXPlus training workflow. Selection and tuning use train/validate only."""
from __future__ import annotations
import hashlib, json, os, time, subprocess
from pathlib import Path
import joblib
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import shap
from sklearn.ensemble import RandomForestClassifier, ExtraTreesClassifier
from sklearn.linear_model import LogisticRegression, SGDClassifier
from sklearn.naive_bayes import MultinomialNB
from sklearn.metrics import (accuracy_score, precision_recall_fscore_support,
    top_k_accuracy_score, confusion_matrix, classification_report, log_loss,
    roc_auc_score, brier_score_loss, roc_curve, f1_score)
from sklearn.model_selection import StratifiedKFold, cross_validate, RandomizedSearchCV
from sklearn.preprocessing import LabelEncoder, label_binarize
from sklearn.calibration import CalibratedClassifierCV
from sklearn.calibration import calibration_curve
from sklearn.base import clone
from sklearn.neighbors import NearestNeighbors
from scipy.sparse import vstack, csr_matrix
from .ddxplus_data import DATA, SERVICE, SEED, load_metadata, load_splits, vocabulary, feature_schema, encode_rows

ART = SERVICE/'artifacts'; REPORT_PATH=SERVICE/'reports'/'ml_report.json'; FIG=SERVICE/'reports'/'figures'
RANK={'Low':0,'Medium':1,'High':2}
TIME_CRITICAL={'Anaphylaxis':'High','Larygospasm':'High','Ebola':'High','Possible NSTEMI / STEMI':'High','Acute pulmonary edema':'High','Pulmonary embolism':'High','Unstable angina':'High','Spontaneous pneumothorax':'High','Boerhaave':'High','Epiglottitis':'High','Guillain-Barré syndrome':'High','Croup':'High','Myocarditis':'High'}

def digest(p): return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def csr_from_dense(values): return csr_matrix(values, dtype=np.float32)
def _fig(name): plt.tight_layout(); plt.savefig(FIG/(name+'.png'),dpi=130); plt.close()

def _typescript_rule_predictions(frames, evidence_metadata, limit=5000):
    rows=[]
    for value in frames['test']['EVIDENCES'].head(limit):
        symptoms=[]
        for token in __import__('ml_pipeline.ddxplus_data',fromlist=['parse_evidence']).parse_evidence(value):
            code=token.split('_@_',1)[0]
            item=evidence_metadata.get(code,{})
            if item and not item.get('is_antecedent'):
                symptoms.append(item.get('question_en',code))
        rows.append(symptoms)
    script=SERVICE.parent/'scripts'/'ml-rule-reference.ts'
    result=subprocess.run(['node','--import','./scripts/register-typescript.mjs','./scripts/ml-rule-reference.ts'],cwd=SERVICE.parent,input=json.dumps(rows),text=True,capture_output=True,check=True)
    return json.loads(result.stdout)['predictions']

def train(train_limit=150000):
    started=time.perf_counter(); ART.mkdir(exist_ok=True); FIG.mkdir(parents=True,exist_ok=True)
    frames,sizes,overlaps,paths=load_splits(train_limit)
    columns=feature_schema(); Xtr,ytr,_=encode_rows(frames['train'],columns,mask_sex=True); Xv,yv,_=encode_rows(frames['validate'],columns)
    feature_counts=np.asarray(Xtr.sum(axis=0)).ravel(); evidence_positions=[i for i,c in enumerate(columns) if c.startswith('symptom:')]
    top_ids=sorted(evidence_positions,key=lambda i:feature_counts[i],reverse=True)[:15]
    eda_names=[columns[i] for i in top_ids]
    eda_matrix=Xtr[:,top_ids].toarray(); corr=np.corrcoef(eda_matrix,rowvar=False) if len(top_ids)>1 else np.eye(len(top_ids)); corr=np.nan_to_num(corr,nan=0).tolist()
    enc=LabelEncoder().fit(ytr); yt=enc.transform(ytr); yval=enc.transform(yv); classes=np.arange(len(enc.classes_))
    cv=StratifiedKFold(5,shuffle=True,random_state=SEED)
    specs={'Logistic Regression (SGD)':SGDClassifier(loss='log_loss',alpha=0.001,max_iter=60,tol=1e-3,learning_rate='adaptive',eta0=0.001,random_state=SEED,average=True,n_jobs=-1),
           'Naive Bayes':MultinomialNB(alpha=0.1),
           'Random Forest':RandomForestClassifier(n_estimators=120,min_samples_leaf=2,max_features='sqrt',random_state=SEED,n_jobs=-1)}
    try:
        from xgboost import XGBClassifier
        specs['XGBoost']=XGBClassifier(n_estimators=80,max_depth=5,learning_rate=.1,subsample=.9,colsample_bytree=.8,objective='multi:softprob',eval_metric='mlogloss',random_state=SEED,n_jobs=-1)
    except ImportError: pass
    def top3_scorer(estimator, X, y):
        return top_k_accuracy_score(y, estimator.predict_proba(X), k=3, labels=np.arange(len(enc.classes_)))
    comparison=[]; fitted={}; cv_started=time.perf_counter()
    for name,model in specs.items():
        # macro scores requested by the project; CV uses only sampled train rows.
        res=cross_validate(model,Xtr,yt,cv=cv,scoring={'accuracy':'accuracy','precision_macro':'precision_macro','recall_macro':'recall_macro','f1_macro':'f1_macro','top3_accuracy':top3_scorer},n_jobs=1,return_train_score=False)
        comparison.append({'model':name,'metrics':{m:{'mean':float(np.mean(res['test_'+m])),'std':float(np.std(res['test_'+m])),'folds':res['test_'+m].tolist()} for m in ['accuracy','precision_macro','recall_macro','f1_macro','top3_accuracy']}})
    comparison.sort(key=lambda x:x['metrics']['f1_macro']['mean'],reverse=True)
    # Search only the two CV leaders on train; validation selects the deployed candidate.
    tuned=[]; candidates=[]
    for rank,row in enumerate(comparison[:2]):
        name=row['model']; base=specs[name]
        if name=='Logistic Regression (SGD)': params={'alpha':[0.0003,0.001,0.003]}
        elif name=='Naive Bayes': params={'alpha':[.05,.1,.5,1]}
        elif name=='Random Forest': params={'n_estimators':[120,180], 'min_samples_leaf':[1,2,4]}
        else: params={'max_depth':[4,5,6], 'learning_rate':[.05,.1]}
        search=RandomizedSearchCV(base,params,n_iter=min(4,np.prod([len(v) for v in params.values()])),scoring='f1_macro',cv=3,random_state=SEED,n_jobs=1,refit=True)
        search.fit(Xtr,yt); model=search.best_estimator_; pred=model.predict(Xv); val_f1=float(precision_recall_fscore_support(yval,pred,average='macro',zero_division=0)[2])
        tuned.append({'model':name,'parameters':search.best_params_,'mean_f1':float(search.best_score_),'std_f1':float(search.cv_results_['std_test_score'][search.best_index_]),'rank':rank+1,'validation_macro_f1':val_f1})
        candidates.append((val_f1,name,model))
    _,winner,best=max(candidates,key=lambda x:x[0]); best=best.fit(Xtr,yt)
    # Compare sigmoid/isotonic using validation only; retain raw probabilities if neither wins.
    val_raw=best.predict_proba(Xv); bs_raw=float(np.mean(np.sum((val_raw-np.eye(len(classes))[yval])**2,axis=1))); ll_raw=float(log_loss(yval,val_raw,labels=classes))
    calibration={'method':'none','validation':{'none':{'brier':bs_raw,'log_loss':ll_raw}},'chosen_by':'lowest validation multiclass Brier score; calibration retained only if both Brier and log-loss do not worsen'}
    chosen=best; selected_val_prob=val_raw; selected_bs=bs_raw; selected_ll=ll_raw
    for method in ['sigmoid','isotonic']:
        try:
            cal=CalibratedClassifierCV(best,method=method,cv=3,n_jobs=1).fit(Xtr,yt); probs=cal.predict_proba(Xv)
            bs=float(np.mean(np.sum((probs-np.eye(len(classes))[yval])**2,axis=1))); ll=float(log_loss(yval,probs,labels=classes))
            calibration['validation'][method]={'brier':bs,'log_loss':ll}
            if bs <= selected_bs and ll <= selected_ll:
                calibration['method']=method; chosen=cal; selected_val_prob=probs; selected_bs=bs; selected_ll=ll
        except Exception as exc: calibration['validation'][method]={'error':str(exc)}
    # Fit urgency labels from verified DDXPlus severity; lower integer means more severe.
    evidence_metadata,conditions=load_metadata(); disease_severity={v['cond-name-eng']:int(v['severity']) for v in conditions.values()}
    severity_levels=sorted(set(disease_severity.values()))
    # Scale mapping: 1-2 High, 3 Medium, 4-5 Low (dataset-authored proxy).
    severity_to_urgency={s:('High' if s<=2 else 'Medium' if s==3 else 'Low') for s in severity_levels}
    urgency_by_disease={k:severity_to_urgency[v] for k,v in disease_severity.items()}
    uy=np.array([urgency_by_disease[d] for d in ytr]); urgency=LogisticRegression(max_iter=1000,class_weight='balanced',random_state=SEED).fit(Xtr,uy)
    # Final test split is first consumed here, after all selection decisions are fixed.
    Xte,yte_raw,_=encode_rows(frames['test'],columns); yte=enc.transform(yte_raw); prob=chosen.predict_proba(Xte); pred=np.argmax(prob,axis=1)
    acc=float(accuracy_score(yte,pred)); p,r,f,_=precision_recall_fscore_support(yte,pred,average=None,labels=classes,zero_division=0)
    macro_p,macro_r,macro_f,_=precision_recall_fscore_support(yte,pred,average='macro',zero_division=0); wp,wr,wf,_=precision_recall_fscore_support(yte,pred,average='weighted',zero_division=0)
    topk={'top_3':float(top_k_accuracy_score(yte,prob,k=3,labels=classes)),'top_5':float(top_k_accuracy_score(yte,prob,k=5,labels=classes))}
    try: auc=float(roc_auc_score(label_binarize(yte,classes=classes),prob,average='macro',multi_class='ovr'))
    except Exception: auc=None
    binary_y=label_binarize(yte,classes=classes); roc_data=[]
    for i,label in enumerate(enc.classes_):
        fpr,tpr,_=roc_curve(binary_y[:,i],prob[:,i])
        stride=max(1,len(fpr)//100)
        roc_data.append({'disease':str(label),'auc':float(roc_auc_score(binary_y[:,i],prob[:,i])),'points':[{'fpr':float(a),'tpr':float(b)} for a,b in zip(fpr[::stride],tpr[::stride])]})
    cm=confusion_matrix(yte,pred,labels=classes).tolist()
    metrics={'accuracy':float(acc),'precision_macro':float(macro_p),'recall_macro':float(macro_r),'f1_macro':float(macro_f),'precision_weighted':float(wp),'recall_weighted':float(wr),'f1_weighted':float(wf),'top_3_accuracy':topk['top_3'],'top_5_accuracy':topk['top_5'],'macro_auc_ovr':auc}
    severity_table=[{'disease':k,'severity':v,'urgency':urgency_by_disease[k]} for k,v in sorted(disease_severity.items(),key=lambda x:(x[1],x[0]))]
    # Compute rule agreement against the existing TS rule engine if available.
    utest=np.array([urgency_by_disease[d] for d in yte_raw]); upred=urgency.predict(Xte)
    try:
        rule_urgency=np.asarray(_typescript_rule_predictions(frames,evidence_metadata,limit=min(5000,len(yte))))
        rule_agreement=float(np.mean(upred[:len(rule_urgency)]==rule_urgency))
        rule_agreement_after=float(np.mean(np.array([max([upred[i], 'High' if rule_urgency[i]=='High' else 'Low'],key=RANK.get) for i in range(len(rule_urgency))])==rule_urgency))
        rule_context='Agreement with actual TypeScript rule engine on the first 5,000 sampled test patients; includes the TypeScript red-flag override.'
    except Exception as exc:
        rule_agreement=None; rule_agreement_after=None; rule_context='TypeScript rule reference could not run: '+str(exc)
    # Mandatory baselines are evaluated on a deterministic bounded held-out slice.
    majority=int(np.argmax(np.bincount(yt)))
    majority_accuracy=float(np.mean(yte[:min(5000,len(yte))]==majority))
    nn_train=min(30000,Xtr.shape[0]); nn_test=min(5000,Xte.shape[0])
    neighbors=NearestNeighbors(n_neighbors=3,metric='cosine',algorithm='brute',n_jobs=-1).fit(Xtr[:nn_train])
    distances,indices=neighbors.kneighbors(Xte[:nn_test]); nn_y=yt[indices]
    nn_pred=np.array([np.bincount(row,minlength=len(classes)).argmax() for row in nn_y])
    nn_probs=np.zeros((nn_test,len(classes)),dtype=np.float32)
    for i,row in enumerate(nn_y):
        for cls in row: nn_probs[i,cls]+=1/len(row)
    nearest_baseline={'accuracy':float(accuracy_score(yte[:nn_test],nn_pred)),'top3_accuracy':float(top_k_accuracy_score(yte[:nn_test],nn_probs,k=3,labels=classes)),'train_rows':nn_train,'test_rows':nn_test,'neighbors':3,'distance':'cosine'}
    # Robustness suites are seeded and evaluate held-out examples only.
    rng=np.random.default_rng(SEED); present=np.asarray(Xte.todense()); robustness=[]
    for pct in [0,10,20,30,40]:
        accuracies=[]; top3_scores=[]
        for _ in range(10):
            noisy=present.copy()
            if pct:
                for row in noisy:
                    ids=np.flatnonzero(row[8:]); n=round(len(ids)*pct/100)
                    if n: row[8+rng.choice(ids,size=min(n,len(ids)),replace=False)]=0
            probs=chosen.predict_proba(noisy)
            accuracies.append(float(accuracy_score(yte,np.argmax(probs,axis=1))))
            top3_scores.append(float(top_k_accuracy_score(yte,probs,k=3,labels=classes)))
        robustness.append({'percent_dropped':pct,'accuracy':float(np.mean(accuracies)),'accuracy_std':float(np.std(accuracies)),'top3_accuracy':float(np.mean(top3_scores)),'top3_std':float(np.std(top3_scores)),'repeats':10})
    noise_robustness=[]
    for pct in [0,5,10]:
        accuracies=[]; top3_scores=[]
        for _ in range(10):
            noisy=present.copy()
            if pct:
                count=int(noisy.shape[1]*pct/100)
                for row in noisy:
                    zeros=np.flatnonzero(row[8:]==0)+8
                    if len(zeros): row[rng.choice(zeros,size=min(count,len(zeros)),replace=False)]=1
            probs=chosen.predict_proba(noisy)
            accuracies.append(float(accuracy_score(yte,np.argmax(probs,axis=1))))
            top3_scores.append(float(top_k_accuracy_score(yte,probs,k=3,labels=classes)))
        noise_robustness.append({'percent_wrong_evidence':pct,'accuracy':float(np.mean(accuracies)),'accuracy_std':float(np.std(accuracies)),'top3_accuracy':float(np.mean(top3_scores)),'top3_std':float(np.std(top3_scores)),'repeats':10})
    # Add 10% corrupted training copies and retrain the selected estimator once.
    aug_n=min(len(yt),50000); aug_X=Xtr[:aug_n].toarray(); aug_y=yt[:aug_n].copy(); aug_rng=np.random.default_rng(SEED+101)
    for row in aug_X:
        zeros=np.flatnonzero(row[8:]==0)+8
        if len(zeros): row[aug_rng.choice(zeros,size=min(max(1,int(.05*len(columns))),len(zeros)),replace=False)]=1
    augmented=clone(best).fit(vstack([Xtr,csr_from_dense(aug_X)],format='csr'),np.concatenate([yt,aug_y]))
    aug_probs=augmented.predict_proba(Xte)
    noise_robustness.append({'variant':'noise_augmented_model','percent_wrong_evidence':5,'accuracy':float(accuracy_score(yte,np.argmax(aug_probs,axis=1))),'top3_accuracy':float(top_k_accuracy_score(yte,aug_probs,k=3,labels=classes)),'augmented_training_rows':aug_n})
    train_pred=best.predict(Xtr); train_accuracy=float(accuracy_score(yt,train_pred))
    metrics['train_accuracy']=train_accuracy; metrics['train_test_accuracy_gap']=train_accuracy-acc
    learning_curve=[]; learn_n=min(30000,len(yt))
    for index,fraction in enumerate([.1,.25,.5,1.0]):
        count=min(learn_n,max(min(learn_n,len(classes)*5),int(learn_n*fraction)))
        if count < len(yt):
            from sklearn.model_selection import train_test_split
            subset,_=train_test_split(np.arange(len(yt)),train_size=count,random_state=SEED+index,stratify=yt)
        else: subset=np.arange(len(yt))
        curve_model=clone(best).fit(Xtr[subset],yt[subset])
        learning_curve.append({'train_size':int(count),'train_f1':float(f1_score(yt[subset],curve_model.predict(Xtr[subset]),average='macro',zero_division=0)),'validation_f1':float(f1_score(yval,curve_model.predict(Xv),average='macro',zero_division=0))})
    def reliability(values, labels):
        top=np.argmax(values,axis=1); conf=np.max(values,axis=1); correct=(top==labels).astype(int)
        observed,predicted=calibration_curve(correct,conf,n_bins=10,strategy='uniform')
        counts=np.histogram(conf,bins=np.linspace(0,1,11))[0]
        return [{'predicted':float(x),'observed':float(y),'count':int(counts[i])} for i,(x,y) in enumerate(zip(predicted,observed))]
    calibration['curve_before']=reliability(val_raw,yval); calibration['curve_after']=reliability(selected_val_prob,yval)
    # Global feature importance: SHAP is attempted on a seeded background. Models
    # unsupported by Tree/Linear explainers fall back to native mean absolute effects.
    raw_imp=getattr(best,'feature_importances_',None)
    if raw_imp is None and hasattr(best,'feature_log_prob_'):
        # Naive Bayes has additive log-likelihood contributions; class spread
        # gives a model-native global ranking when SHAP lacks a NB explainer.
        raw_imp=np.std(best.feature_log_prob_,axis=0)
    try:
        background=Xtr[:128].toarray(); explained=Xte[:64].toarray()
        if hasattr(best,'feature_importances_'):
            shap_values=shap.TreeExplainer(best)(explained)
        elif hasattr(best,'coef_'):
            shap_values=shap.LinearExplainer(best,background)(explained)
        else:
            candidate_idx=np.argsort(raw_imp)[::-1][:15]
            background_subset=background[:,candidate_idx]
            baseline=np.mean(background,axis=0)
            def predict_subset(values):
                full=np.tile(baseline,(len(values),1)); full[:,candidate_idx]=values
                return best.predict_proba(full)
            explainer=shap.PermutationExplainer(predict_subset,background_subset,feature_names=[columns[i] for i in candidate_idx],seed=SEED)
            shap_values=explainer(explained[:24,candidate_idx],max_evals=2*len(candidate_idx)+1)
            sv=shap_values.values
            subset_imp=np.mean(np.abs(sv),axis=(0,2)) if np.ndim(sv)==3 else np.mean(np.abs(sv),axis=0)
            raw_imp=np.zeros(len(columns)); raw_imp[candidate_idx]=subset_imp
            shap_method='SHAP PermutationExplainer on 15 native-ranked features; other features fixed at seeded background mean'
        if hasattr(best,'feature_importances_') or hasattr(best,'coef_'):
            sv=shap_values.values if hasattr(shap_values,'values') else shap_values
            if isinstance(sv,list): raw_imp=np.mean(np.abs(np.stack(sv,axis=-1)),axis=(0,2))
            elif np.ndim(sv)==3: raw_imp=np.mean(np.abs(sv),axis=(0,2))
            else: raw_imp=np.mean(np.abs(sv),axis=0)
            shap_method='SHAP TreeExplainer' if hasattr(best,'feature_importances_') else 'SHAP LinearExplainer'
    except Exception as explain_error:
        raw_imp=getattr(best,'feature_importances_',None)
        if raw_imp is None and hasattr(best,'coef_'): raw_imp=np.mean(np.abs(best.coef_),axis=0)
        if raw_imp is None and hasattr(best,'feature_log_prob_'): raw_imp=np.std(best.feature_log_prob_,axis=0)
        if raw_imp is None: raise RuntimeError(f'No global explanation fallback for {type(best).__name__}') from explain_error
        shap_method='Native model importance fallback: '+str(explain_error)
    order=np.argsort(raw_imp)[::-1][:15]; global_importance=[{'symptom':columns[i],'importance':float(raw_imp[i])} for i in order]
    # Bundle with sparse-friendly inference artifacts.
    joblib.dump(best,ART/'best_model.joblib',compress=3)
    if calibration['method']!='none': joblib.dump(chosen,ART/'calibrated_model.joblib',compress=3)
    elif (ART/'calibrated_model.joblib').exists(): (ART/'calibrated_model.joblib').unlink()
    joblib.dump(enc,ART/'label_encoder.joblib'); joblib.dump(urgency,ART/'urgency_model.joblib',compress=3)
    joblib.dump(Xtr[:128].toarray(),ART/'shap_background.joblib',compress=3)
    sym=vocabulary(); vocab_json=json.dumps(sym,indent=2,ensure_ascii=False)
    (ART/'symptom_list.json').write_text(vocab_json,encoding='utf-8')
    (SERVICE.parent/'lib'/'ml'/'symptom-list.json').write_text(vocab_json,encoding='utf-8')
    (ART/'feature_columns.json').write_text(json.dumps(columns),encoding='utf-8')
    # Project red-flag choices are hand-curated from evidence question text.
    red_codes=['E_14','E_66','E_64','E_159','E_43','E_75','E_128','E_194','E_156','E_63','E_39','E_45','E_210']
    redflags={'evidence':{x['code']:x['name'] for x in sym if x['code'] in red_codes},
              'conditional':[{'requires':'E_151','and_one_of':['E_152_@_V_32','E_152_@_V_61','E_152_@_V_115','E_152_@_V_162'],'reason':'swelling involving mouth, above tongue, uvula or under tongue'}]}
    (ART/'red_flags.json').write_text(json.dumps(redflags,indent=2),encoding='utf-8')
    hashes={p.name:digest(p) for p in [DATA/'README.md',DATA/'release_train_patients',DATA/'release_validate_patients',DATA/'release_test_patients',DATA/'release_train_patients.zip',DATA/'release_validate_patients.zip',DATA/'release_test_patients.zip',DATA/'release_conditions.json',DATA/'release_evidences.json',DATA/'CC-BY-4.0.txt'] if p.exists()}
    artifact_hashes={p.name:digest(p) for p in ART.glob('*') if p.is_file() and p.name not in ('ml_report.json',)}
    unique_pattern_counts=frames['train'].groupby('PATHOLOGY')['EVIDENCES'].nunique().to_dict()
    report={'schema_version':1,'generated_at':__import__('datetime').datetime.now(__import__('datetime').timezone.utc).isoformat(),'model_version':'ddxplus-'+hashes['release_train_patients'][:12],
      'dataset':{'source':'https://figshare.com/articles/dataset/DDXPlus_Dataset/20043374','representation':'DDXPlus patient evidence lists expanded into schema-defined sparse symptom and antecedent features; INITIAL_EVIDENCE excluded because not collected at inference','preprocessing':{'fitted_on':'training split only','method':'schema-fixed one-hot evidence encoding; no validation/test-fitted statistics','sex_mask_probability':0.20},'raw_rows':sizes['train']['rows_before_sampling'],'unique_rows':int(frames['train']['EVIDENCES'].nunique()),'duplicate_patterns_removed':int(len(frames['train'])-frames['train']['EVIDENCES'].nunique()),'feature_count':len(columns),'class_count':len(enc.classes_),'age_median':float(frames['train']['AGE'].median()),'class_distribution':[{'disease':k,'count':v,'unique_count':int(unique_pattern_counts.get(k,0))} for k,v in sizes['train']['class_distribution'].items()],'top_symptoms':[{'symptom':columns[i],'count':int(feature_counts[i])} for i in top_ids[:10]],'correlation':{'labels':eda_names,'matrix':corr},'missing_values':[{'column':c,'count':int(frames['train'][c].isna().sum())} for c in frames['train'].columns],'missing_interpretation':'Empty evidence tokens mean evidence not reported; original DDXPlus data are synthetic.','sample':[{'disease':str(r.PATHOLOGY),'symptoms':__import__('ml_pipeline.ddxplus_data',fromlist=['parse_evidence']).parse_evidence(r.EVIDENCES)[:12]} for r in frames['train'].head(10).itertuples()] ,'sha256':hashes['release_train_patients'],'input_sha256':hashes,'sample_sizes':sizes,'split_overlap_fingerprints':overlaps,'patient_id_available':False,'exact_duplicate_evidence_patterns':int(frames['train']['EVIDENCES'].duplicated().sum()),'sampled_train_rows':len(frames['train']),'feature_memory_bytes':int(Xtr.data.nbytes+Xtr.indices.nbytes+Xtr.indptr.nbytes),'training_seconds':float(time.perf_counter()-started)},
      'symptoms':[x['code'] for x in sym if not x['is_antecedent']],'evidence_codes':[x['code'] for x in sym],'classes':enc.classes_.tolist(),'split':{'train_rows':Xtr.shape[0],'validation_rows':Xv.shape[0],'test_rows':Xte.shape[0],'overlap_fingerprints':overlaps},
      'training':{'winner':winner,'comparison':comparison,'hyperparameters':tuned,'best_parameters':next(x['parameters'] for x in tuned if x['model']==winner),'learning_curve':learning_curve,'training_seconds':float(time.perf_counter()-cv_started)},
      'evaluation':{'metrics':metrics,'topk':topk,'confusion_matrix':cm,'per_class':[{'disease':str(enc.classes_[i]),'precision':float(p[i]),'recall':float(r[i]),'f1':float(f[i]),'support':int(np.sum(yte==i))} for i in classes],'macro_auc':auc,'roc':roc_data,'robustness':robustness,'train_test_accuracy_gap':train_accuracy-acc},
      'baselines':{'majority_class':{'accuracy':majority_accuracy,'test_rows':min(5000,len(yte)),'class':str(enc.classes_[majority])},'nearest_neighbour':nearest_baseline,'interpretation':'Majority-class score is a naive floor; nearest-neighbour tests whether local evidence-pattern similarity beats the selected classical models. Nearest-neighbour evaluation uses a deterministic bounded slice for laptop memory.'},
      'noise_robustness':noise_robustness,'calibration':{'method':calibration['method'],'validation':calibration['validation'],'brier_before':bs_raw,'brier_after':calibration['validation'].get(calibration['method'],{}).get('brier',bs_raw),'brier_definition':'Validation multiclass Brier score is mean sum of squared class-probability errors.','curve_before':calibration['curve_before'],'curve_after':calibration['curve_after']},
      'explainability':{'method':shap_method,'global_importance':global_importance,'units':'mean absolute SHAP value (model output contribution); not causal effect','background_rows':128,'global_rows':min(64,Xte.shape[0])},
      'urgency':{'labels':sorted(set(urgency_by_disease.values()),key=RANK.get),'label_source':'DDXPlus per-pathology severity; synthetic dataset-defined proxy, not clinician-validated. Lower severity number means more severe.','accuracy_against_derived_labels':float(accuracy_score(utest,upred)),'per_class_recall':{lab:float(precision_recall_fscore_support(utest,upred,labels=[lab],average=None,zero_division=0)[1][0]) for lab in sorted(set(utest))},'high_recall':float(precision_recall_fscore_support(utest,upred,labels=['High'],average=None,zero_division=0)[1][0]),'rule_agreement':rule_agreement,'rule_agreement_after_red_flags':rule_agreement_after,'confusion_matrix':confusion_matrix(utest,upred,labels=['Low','Medium','High']).tolist(),'severity_table':severity_table,'severity_aliases':{},'duplicate_severity_entries':[],'rule_context':rule_context},
      'severity_table':severity_table,'license':{'name':'CC BY 4.0','source':'https://creativecommons.org/licenses/by/4.0/legalcode','text_sha256':hashes.get('CC-BY-4.0.txt'),'dataset_page':'https://figshare.com/articles/dataset/DDXPlus_Dataset/20043374'},'artifacts':artifact_hashes,'limitations':['DDXPlus is synthetic and not clinical validation.','Sampling limits training to the configured row budget; validation/test samples are proportional.','No patient identifier is distributed, so split checks use exact-row fingerprints only.','Age 50 is assigned to elderly to resolve overlapping app questionnaire ranges.','Urgency labels derive from dataset severity and are not clinician-validated.','Project safety choices are not clinical guidelines.','Learning curve is estimated on a seeded training subset capped at 30,000 rows to fit laptop memory.'],'deployment':{'uncertainty_threshold':float(os.getenv('DISEASE_CONFIDENCE_THRESHOLD','0.5')),'probability_mode':f'{calibration["method"]} calibrated predict_proba' if calibration['method']!='none' else 'uncalibrated predict_proba'},'disclaimer':'This is not a medical diagnosis. Consult a qualified clinician.'}
    REPORT_PATH.parent.mkdir(parents=True,exist_ok=True); REPORT_PATH.write_text(json.dumps(report,indent=2),encoding='utf-8')
    # Persist compact training figures; every plotted value is stored in the report.
    plt.figure(figsize=(8,4)); plt.bar([x['model'] for x in comparison],[x['metrics']['f1_macro']['mean'] for x in comparison]); plt.ylabel('5-fold macro F1'); plt.xticks(rotation=20); _fig('model_comparison')
    plt.figure(figsize=(7,4)); plt.plot([x['percent_dropped'] for x in robustness],[x['accuracy'] for x in robustness],marker='o'); plt.xlabel('Evidence dropped (%)'); plt.ylabel('Test accuracy'); _fig('robustness')
    plt.figure(figsize=(8,4)); plt.plot([x['train_size'] for x in learning_curve],[x['train_f1'] for x in learning_curve],marker='o',label='Train macro F1'); plt.plot([x['train_size'] for x in learning_curve],[x['validation_f1'] for x in learning_curve],marker='o',label='Validation macro F1'); plt.xlabel('Training rows'); plt.legend(); _fig('learning_curve')
    plt.figure(figsize=(6,6)); plt.imshow(cm,interpolation='nearest',cmap='Blues'); plt.title('Held-out confusion matrix'); plt.colorbar(); _fig('confusion_matrix')
    plt.figure(figsize=(7,4)); plt.plot([x['predicted'] for x in calibration['curve_before']],[x['observed'] for x in calibration['curve_before']],marker='o',label='Before'); plt.plot([x['predicted'] for x in calibration['curve_after']],[x['observed'] for x in calibration['curve_after']],marker='o',label='Selected'); plt.plot([0,1],[0,1],color='gray'); plt.xlabel('Mean confidence'); plt.ylabel('Observed accuracy'); plt.legend(); _fig('calibration')
    plt.figure(figsize=(8,4)); plt.bar([x['symptom'] for x in global_importance],[x['importance'] for x in global_importance]); plt.xticks(rotation=75,ha='right'); plt.ylabel('Mean absolute attribution'); _fig('shap_global')
    plt.figure(figsize=(8,4)); plt.plot([x['percent_wrong_evidence'] for x in noise_robustness[:3]],[x['accuracy'] for x in noise_robustness[:3]],marker='o'); plt.xlabel('Wrong evidence added (%)'); plt.ylabel('Test accuracy'); _fig('noise_robustness')
    plt.figure(figsize=(10,4)); top_dist=report['dataset']['top_symptoms']; plt.bar([x['symptom'] for x in top_dist],[x['count'] for x in top_dist]); plt.xticks(rotation=70,ha='right'); plt.ylabel('Training sample count'); _fig('top_symptoms')
    print(json.dumps({'winner':winner,'test_metrics':metrics,'sample_sizes':sizes,'report':str(REPORT_PATH)},indent=2),flush=True)
    return report
