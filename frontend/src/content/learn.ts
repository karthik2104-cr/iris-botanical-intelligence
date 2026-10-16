import type { PipelineStage } from "../types/api";

export const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "load",
    title: "Dataset loading",
    what: "The pipeline loads the Iris dataset with sklearn.datasets.load_iris and converts it into a pandas DataFrame. Numeric species codes are labeled setosa, versicolor, and virginica.",
    why: "Supervised classification needs a table of measurements and a known species for each flower.",
    library: "scikit-learn load_iris and pandas",
  },
  {
    id: "eda",
    title: "Exploratory data analysis",
    what: "The app counts rows and columns, checks missing values and duplicate rows, and calculates descriptive statistics, class balance, correlations, and feature distributions.",
    why: "These checks show whether the table is complete and how the measurements differ across species before any model is trained.",
    library: "pandas, NumPy, Matplotlib, and Seaborn",
  },
  {
    id: "split",
    title: "Train-test splitting",
    what: "The 150 flowers are divided with a stratified 80/20 split and random seed 42. Each species keeps the same proportion in the training and test sets.",
    why: "The test set is a final check on flowers that were not used to compare models. Stratifying keeps every species represented, and the fixed seed makes the split reproducible.",
    library: "scikit-learn train_test_split",
  },
  {
    id: "preprocess",
    title: "Feature preprocessing",
    what: "Logistic regression, k-nearest neighbors, and the support vector machine receive a StandardScaler inside a scikit-learn Pipeline. The decision tree, random forest, and Gaussian naive Bayes use the original centimeter values. No imputer is added because the canonical table has no missing entries.",
    why: "Distance-based and linear models are sensitive to measurement scale. Fitting the scaler inside the pipeline, and only on training rows, keeps test-set information out of preprocessing.",
    library: "scikit-learn Pipeline and StandardScaler",
  },
  {
    id: "train",
    title: "Model training",
    what: "Six classifiers are trained on the training split: logistic regression, k-nearest neighbors, a decision tree, a random forest, a support vector machine, and Gaussian naive Bayes. Hyperparameters are fixed and modest. They are not exhaustively tuned.",
    why: "The dataset is small. Comparing several simple models is more informative than assuming one algorithm is best.",
    library: "scikit-learn estimators",
  },
  {
    id: "select",
    title: "Cross-validation and model selection",
    what: "Each model is scored with 5-fold stratified cross-validation on the training set. The selected model has the highest mean macro-F1. Mean accuracy is the tie-breaker. If those scores also match, the earlier model in the fixed catalog is kept.",
    why: "Cross-validation reuses the training flowers without looking at the test labels. Macro-F1 gives each species an equal vote.",
    library: "scikit-learn StratifiedKFold and cross_validate",
  },
  {
    id: "evaluate",
    title: "Final evaluation",
    what: "The selected model is fit on the full training split and then scored once on the held-out test set. Accuracy, precision, recall, macro-F1, a confusion matrix, and a classification report are saved.",
    why: "This is the first time the test labels are used. It estimates how the chosen model handles unseen rows from this same table.",
    library: "scikit-learn classification metrics",
  },
  {
    id: "predict",
    title: "Prediction and probability estimation",
    what: "The saved pipeline loads once when the API starts. A request supplies four measurements. The model returns a species and a probability for each species.",
    why: "Loading the saved model once keeps predictions consistent with the evaluation run and avoids retraining on every request.",
    library: "Joblib, FastAPI, and the selected scikit-learn estimator",
  },
];

export const GLOSSARY: Array<{ term: string; definition: string }> = [
  {
    term: "Features",
    definition:
      "The input measurements a model uses. Here they are sepal length, sepal width, petal length, and petal width, all in centimeters.",
  },
  {
    term: "Target variable",
    definition: "The label the model learns to predict. In this project the target is the Iris species.",
  },
  {
    term: "Classification",
    definition:
      "A supervised task that assigns each example to one category from a fixed list. Each flower is assigned to one of three species.",
  },
  {
    term: "Training data",
    definition:
      "The flowers used to fit preprocessing and model parameters, and to compare models. This project uses a stratified 80 percent split: 120 flowers.",
  },
  {
    term: "Test data",
    definition:
      "Flowers held out until after model selection. Their labels are used once to estimate the selected model's performance. This project holds out 30 flowers.",
  },
  {
    term: "Overfitting",
    definition:
      "A model that memorizes the training flowers, including quirks that do not repeat, and then does worse on new flowers. A large gap between the training score and the test score is a warning sign.",
  },
  {
    term: "Cross-validation",
    definition:
      "A way to score a model by rotating which training rows are held out. This project uses 5-fold stratified cross-validation, so every species stays represented in each fold.",
  },
  {
    term: "Precision",
    definition:
      "Among the flowers the model called a given species, the fraction that truly belong to that species.",
  },
  {
    term: "Recall",
    definition:
      "Among the flowers that truly belong to a species, the fraction the model found.",
  },
  {
    term: "F1-score",
    definition:
      "The harmonic mean of precision and recall. Macro-F1 averages the three species equally. This dataset is balanced, so macro-F1 and accuracy are often close, but they answer different questions.",
  },
  {
    term: "Confusion matrix",
    definition:
      "A table of actual species against predicted species. Counts on the diagonal were correct. Counts off the diagonal were mistakes.",
  },
  {
    term: "Predicted probability",
    definition:
      "The model's score for each species, between 0 and 1. For the six classifiers in this project, the three scores sum to about 1. A score of 0.90 means the model assigns most of its confidence to that species. It is not biological certainty.",
  },
];

export const LOCAL_LIMITATIONS = [
  "The Iris dataset contains 150 samples from a classic educational study. A high score does not establish performance on new flower populations, sensors, or species.",
  "Identical measurement rows, when present, can fall on both sides of the split and make the test score slightly optimistic.",
  "Feature importance, class-average gaps, and centroid distances describe patterns in this dataset. They are not causal effects.",
  "Predicted probabilities rank the three species for the supplied measurements. They are not botanical certainty.",
  "Hyperparameters were not tuned with a search. A search on this small table could overstate how well the winner generalizes.",
];
