"""Shared constants for the Iris training pipeline."""

from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[2]
ARTIFACTS_DIR = PROJECT_ROOT / "ml" / "artifacts"
REPORTS_DIR = PROJECT_ROOT / "reports"
FIGURES_DIR = REPORTS_DIR / "figures"

SEED = 42
TEST_SIZE = 0.2
CV_FOLDS = 5
MAX_MEASUREMENT_CM = 30.0

FEATURES: list[dict[str, str]] = [
    {
        "key": "sepal_length_cm",
        "column": "sepal length (cm)",
        "label": "Sepal length",
        "unit": "cm",
        "description": (
            "Length of the sepal, the outer leaf-like part of the flower, measured in centimeters."
        ),
    },
    {
        "key": "sepal_width_cm",
        "column": "sepal width (cm)",
        "label": "Sepal width",
        "unit": "cm",
        "description": "Width of the sepal at its widest point, measured in centimeters.",
    },
    {
        "key": "petal_length_cm",
        "column": "petal length (cm)",
        "label": "Petal length",
        "unit": "cm",
        "description": (
            "Length of the petal, the inner colored part of the flower, measured in centimeters."
        ),
    },
    {
        "key": "petal_width_cm",
        "column": "petal width (cm)",
        "label": "Petal width",
        "unit": "cm",
        "description": "Width of the petal at its widest point, measured in centimeters.",
    },
]

FEATURE_COLUMNS = [feature["column"] for feature in FEATURES]
FEATURE_KEYS = [feature["key"] for feature in FEATURES]

PIPELINE_STAGES: list[dict[str, str]] = [
    {
        "id": "load",
        "title": "Dataset loading",
        "what": (
            "The pipeline loads the Iris dataset with sklearn.datasets.load_iris and converts it "
            "into a pandas DataFrame. Numeric species codes are labeled setosa, versicolor, and virginica."
        ),
        "why": "Supervised classification needs a table of measurements and a known species for each flower.",
        "library": "scikit-learn load_iris and pandas",
    },
    {
        "id": "eda",
        "title": "Exploratory data analysis",
        "what": (
            "The app counts rows and columns, checks missing values and duplicate rows, and calculates "
            "descriptive statistics, class balance, correlations, and feature distributions."
        ),
        "why": (
            "These checks show whether the table is complete and how the measurements differ across "
            "species before any model is trained."
        ),
        "library": "pandas, NumPy, Matplotlib, and Seaborn",
    },
    {
        "id": "split",
        "title": "Train-test splitting",
        "what": (
            "The 150 flowers are divided with a stratified 80/20 split and random seed 42. "
            "Each species keeps the same proportion in the training and test sets."
        ),
        "why": (
            "The test set is a final check on flowers that were not used to compare models. "
            "Stratifying keeps every species represented, and the fixed seed makes the split reproducible."
        ),
        "library": "scikit-learn train_test_split",
    },
    {
        "id": "preprocess",
        "title": "Feature preprocessing",
        "what": (
            "Logistic regression, k-nearest neighbors, and the support vector machine receive a "
            "StandardScaler inside a scikit-learn Pipeline. The decision tree, random forest, and "
            "Gaussian naive Bayes use the original centimeter values. No imputer is added because "
            "the canonical table has no missing entries."
        ),
        "why": (
            "Distance-based and linear models are sensitive to measurement scale. Fitting the scaler "
            "inside the pipeline, and only on training rows, keeps test-set information out of preprocessing."
        ),
        "library": "scikit-learn Pipeline and StandardScaler",
    },
    {
        "id": "train",
        "title": "Model training",
        "what": (
            "Six classifiers are trained on the training split: logistic regression, k-nearest neighbors, "
            "a decision tree, a random forest, a support vector machine, and Gaussian naive Bayes. "
            "Hyperparameters are fixed and modest. They are not exhaustively tuned."
        ),
        "why": (
            "The dataset is small. Comparing several simple models is more informative than assuming "
            "one algorithm is best."
        ),
        "library": "scikit-learn estimators",
    },
    {
        "id": "select",
        "title": "Cross-validation and model selection",
        "what": (
            "Each model is scored with 5-fold stratified cross-validation on the training set. "
            "The selected model has the highest mean macro-F1. Mean accuracy is the tie-breaker. "
            "If those scores also match, the earlier model in the fixed catalog is kept."
        ),
        "why": (
            "Cross-validation reuses the training flowers without looking at the test labels. "
            "Macro-F1 gives each species an equal vote."
        ),
        "library": "scikit-learn StratifiedKFold and cross_validate",
    },
    {
        "id": "evaluate",
        "title": "Final evaluation",
        "what": (
            "The selected model is fit on the full training split and then scored once on the held-out "
            "test set. Accuracy, precision, recall, macro-F1, a confusion matrix, and a classification "
            "report are saved."
        ),
        "why": "This is the first time the test labels are used. It estimates how the chosen model handles unseen rows from this same table.",
        "library": "scikit-learn classification metrics",
    },
    {
        "id": "predict",
        "title": "Prediction and probability estimation",
        "what": (
            "The saved pipeline loads once when the API starts. A request supplies four measurements. "
            "The model returns a species and a probability for each species."
        ),
        "why": "Loading the saved model once keeps predictions consistent with the evaluation run and avoids retraining on every request.",
        "library": "Joblib, FastAPI, and the selected scikit-learn estimator",
    },
]

PREPROCESSING_NOTES: list[str] = [
    "The four measurements are already in centimeters, so no unit conversion is applied.",
    "The canonical Iris table has no missing values. Training stops if missing values appear instead of imputing them.",
    "Duplicate rows are counted and retained. They are part of the published dataset, and dropping them would change the classic 150-row benchmark.",
    "The species target from scikit-learn is an integer code. Display names are Iris setosa, Iris versicolor, and Iris virginica.",
    "train_test_split uses test_size=0.2, stratify=y, and random_state=42. That yields 120 training flowers and 30 test flowers, with 40 and 10 of each species.",
    "StandardScaler sits inside a Pipeline for logistic regression, k-nearest neighbors, and the support vector machine. During cross-validation, scikit-learn fits that scaler on each training fold only.",
    "The decision tree, random forest, and Gaussian naive Bayes are trained on the raw centimeter values.",
    "The held-out test set is not used to fit preprocessing or to choose the model.",
    "Exploratory charts describe the full published table. Model fitting uses only the training split.",
]

LIMITATIONS: list[str] = [
    "The Iris dataset contains 150 samples from a classic educational study. A high score does not establish performance on new flower populations, sensors, or species.",
    "Identical measurement rows, when present, can fall on both sides of the split and make the test score slightly optimistic.",
    "Feature importance, class-average gaps, and centroid distances describe patterns in this dataset. They are not causal effects.",
    "Predicted probabilities rank the three species for the supplied measurements. They are not botanical certainty.",
    "Hyperparameters were not tuned with a search. A search on this small table could overstate how well the winner generalizes.",
]
