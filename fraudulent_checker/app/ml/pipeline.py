from app.ml.config import CONFIG
from app.ml.features.amount import amount_score
from app.ml.features.anomaly import anomaly_score
from app.ml.features.embedding import embedding_score
from app.ml.features.entropy import text_entropy
from app.ml.features.keyword import has_critical_keyword, keyword_score
from app.ml.utils.explainer import explain
from app.ml.utils.math_utils import sigmoid, noise
from app.ml.utils.preprocessing import normalize_text


def final_score(raw_score):
    scaled = max(0, min(100, raw_score * 100))
    return raw_score * 100


def aggregate(features):
    w = CONFIG["weights"]

    score = (
            w["amount"] * features["amount"] +
            w["keyword"] * features["keyword"] +
            w["embedding"] * features["embedding"] +
            w["anomaly"] * features["anomaly"] +
            w["entropy"] * features["entropy"]
    )

    return score


def compute_risk(payment, model, template_embeddings):
    print("MODEL:", type(model))
    print("EMB:", type(template_embeddings))
    print("EMB SHAPE:", getattr(template_embeddings, "shape", None))
    text = normalize_text(payment.message)

    critical_keyword = has_critical_keyword(text)
    features = {
        "amount": amount_score(payment.amount),
        "keyword": 1.0 if critical_keyword else keyword_score(text),
        "embedding": embedding_score(text, template_embeddings, model),
        "anomaly": max(0, anomaly_score(text) - 0.2),
        "entropy": max(0, text_entropy(text) - 0.2),
    }

    if not text.strip():
        features["anomaly"] += 0.3

    if features["amount"] <= 10 and features["keyword"] == 0:
        return 0, explain(features)

    raw = aggregate(features)
    if critical_keyword:
        raw += 0.45
    raw += noise()

    print("RAW SCORE:", raw)

    risk = final_score(raw)

    return min(risk, 100), explain(features)
