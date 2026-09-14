const { getExchangeRate, DEFAULT_BASE } = require("../services/exchangeRateService");
const { SUPPORTED_CURRENCIES } = require("../utils/procurementHelpers");

/**
 * GET /api/procurement/exchange-rate?currency=EUR&base=USD
 */
exports.getRate = async (req, res) => {
  try {
    const currency = String(req.query.currency || "USD").toUpperCase();
    const base = String(req.query.base || DEFAULT_BASE).toUpperCase();

    if (!SUPPORTED_CURRENCIES.includes(currency)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported currency: ${currency}`,
      });
    }
    if (!SUPPORTED_CURRENCIES.includes(base)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported base currency: ${base}`,
      });
    }

    const data = await getExchangeRate(currency, base);
    return res.json({ success: true, data });
  } catch (err) {
    console.error("exchange rate fetch error:", err.message);
    return res.status(502).json({
      success: false,
      message: err.message || "Failed to fetch exchange rate",
    });
  }
};
