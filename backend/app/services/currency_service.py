"""Currency conversion for the traffic-fine calculator.

Uses a live free FX API when reachable, otherwise falls back to bundled
indicative rates (LKR per 1 unit of foreign currency)."""
import requests

# Indicative fallback rates: 1 foreign unit = X LKR
FALLBACK_RATES_TO_LKR = {
    "USD": 305.0, "EUR": 330.0, "GBP": 388.0,
    "INR": 3.65, "AUD": 200.0, "CAD": 223.0, "LKR": 1.0,
}
SUPPORTED = list(FALLBACK_RATES_TO_LKR.keys())


def lkr_to_currency(amount_lkr: float, target: str):
    target = target.upper()
    if target not in FALLBACK_RATES_TO_LKR:
        raise ValueError(f"Unsupported currency: {target}")
    rate_to_lkr = _live_rate(target) or FALLBACK_RATES_TO_LKR[target]
    converted = amount_lkr / rate_to_lkr
    return round(converted, 2), round(rate_to_lkr, 4)


def _live_rate(target: str):
    """Return LKR value of 1 unit of `target` using a free API; None on failure."""
    try:
        url = f"https://open.er-api.com/v6/latest/{target}"
        data = requests.get(url, timeout=6).json()
        lkr = data.get("rates", {}).get("LKR")
        return float(lkr) if lkr else None
    except Exception:
        return None


def currency_to_lkr(amount: float, source: str):
    source = source.upper()
    if source not in FALLBACK_RATES_TO_LKR:
        raise ValueError(f"Unsupported currency: {source}")
    rate_to_lkr = _live_rate(source) or FALLBACK_RATES_TO_LKR[source]
    converted = amount * rate_to_lkr
    return round(converted, 2), round(rate_to_lkr, 4)
