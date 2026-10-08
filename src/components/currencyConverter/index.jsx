import { useEffect, useMemo, useState } from "react";
import { FaArrowRightArrowLeft, FaArrowUpRightFromSquare, FaArrowsRotate, FaArrowRightLong, FaGlobe, FaStar } from "react-icons/fa6";
import styles from "./styles.module.css";

const currencies = [
    { code: "USD", name: "US Dollar" }, { code: "EUR", name: "Euro" }, { code: "GBP", name: "British Pound" },
    { code: "INR", name: "Indian Rupee" }, { code: "JPY", name: "Japanese Yen" }, { code: "CAD", name: "Canadian Dollar" },
    { code: "AUD", name: "Australian Dollar" }, { code: "CHF", name: "Swiss Franc" }, { code: "MXN", name: "Mexican Peso" },
    { code: "SGD", name: "Singapore Dollar" }, { code: "THB", name: "Thai Baht" }, { code: "NZD", name: "New Zealand Dollar" },
    { code: "SEK", name: "Swedish Krona" }, { code: "NOK", name: "Norwegian Krone" }, { code: "BRL", name: "Brazilian Real" },
    { code: "ZAR", name: "South African Rand" }, { code: "KRW", name: "South Korean Won" }, { code: "CNY", name: "Chinese Yuan" },
    { code: "HKD", name: "Hong Kong Dollar" }, { code: "PHP", name: "Philippine Peso" }, { code: "PLN", name: "Polish Zloty" },
];
const codes = currencies.map(({ code }) => code);
const currencyName = (code) => currencies.find((currency) => currency.code === code)?.name ?? code;
const cacheKey = "atlas-fx-rate-cache-v1";
const pinsKey = "atlas-fx-pinned-currencies-v1";
const defaultPins = ["EUR", "INR", "JPY"];

const readCache = () => {
    try { return JSON.parse(localStorage.getItem(cacheKey) ?? "{}"); } catch { return {}; }
};
const readPins = () => {
    try {
        const saved = JSON.parse(localStorage.getItem(pinsKey) ?? "null");
        return Array.isArray(saved) ? saved.filter((code) => codes.includes(code)) : defaultPins;
    } catch { return defaultPins; }
};
const formatCurrency = (amount, code) => new Intl.NumberFormat("en-US", { style: "currency", currency: code }).format(amount);
const formatAmount = (amount, code) => new Intl.NumberFormat("en-US", { minimumFractionDigits: code === "JPY" || code === "KRW" ? 0 : 2, maximumFractionDigits: code === "JPY" || code === "KRW" ? 0 : 2 }).format(amount);
const formatRate = (rate) => new Intl.NumberFormat("en-US", { maximumSignificantDigits: 6 }).format(rate);
const formatDate = (date) => new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));

const CurrencyConverter = () => {
    const [fromCurrency, setFromCurrency] = useState("USD");
    const [toCurrency, setToCurrency] = useState("EUR");
    const [amount, setAmount] = useState("500");
    const [rateCache, setRateCache] = useState(() => readCache());
    const [pinnedCurrencies, setPinnedCurrencies] = useState(() => readPins());
    const [rateStatus, setRateStatus] = useState({ requestKey: "", error: "" });
    const [refreshId, setRefreshId] = useState(0);
    const requestKey = `${fromCurrency}:${refreshId}`;
    const isLoading = rateStatus.requestKey !== requestKey;
    const rateError = isLoading ? "" : rateStatus.error;

    useEffect(() => {
        const controller = new AbortController();
        const quotes = codes.filter((code) => code !== fromCurrency).join(",");
        const query = new URLSearchParams({ base: fromCurrency, quotes });

        const loadRates = async () => {
            try {
                const response = await fetch(`https://api.frankfurter.dev/v2/rates?${query}`, { signal: controller.signal });
                if (!response.ok) throw new Error("The rate service could not return rates right now.");
                const rows = await response.json();
                if (!Array.isArray(rows) || rows.length === 0) throw new Error("No rates were returned for this currency.");
                const snapshot = { date: rows[0].date, rates: Object.fromEntries(rows.map(({ quote, rate }) => [quote, rate])) };
                if (controller.signal.aborted) return;
                setRateCache((current) => ({ ...current, [fromCurrency]: snapshot }));
                try { localStorage.setItem(cacheKey, JSON.stringify({ ...readCache(), [fromCurrency]: snapshot })); } catch { /* The live rates still work when storage is unavailable. */ }
                setRateStatus({ requestKey, error: "" });
            } catch (error) {
                if (controller.signal.aborted) return;
                setRateStatus({ requestKey, error: error.message || "Could not load exchange rates." });
            }
        };
        loadRates();
        return () => controller.abort();
    }, [fromCurrency, refreshId, requestKey]);

    useEffect(() => {
        try { localStorage.setItem(pinsKey, JSON.stringify(pinnedCurrencies)); } catch { /* Pinning remains available until this page is closed. */ }
    }, [pinnedCurrencies]);

    const snapshot = rateCache[fromCurrency];
    const rate = fromCurrency === toCurrency ? 1 : snapshot?.rates?.[toCurrency] ?? null;
    const numericAmount = Number(amount);
    const converted = useMemo(() => rate !== null && amount.trim() !== "" && Number.isFinite(numericAmount) ? numericAmount * rate : null, [amount, numericAmount, rate]);
    const dateText = snapshot?.date ? formatDate(snapshot.date) : "";
    const suggestedCodes = ["EUR", "GBP", "INR", "JPY", "CAD", "THB"].filter((code) => code !== fromCurrency && snapshot?.rates?.[code] !== undefined);
    const quickPins = pinnedCurrencies.filter((code) => code !== fromCurrency && snapshot?.rates?.[code] !== undefined);
    const currentIsPinned = pinnedCurrencies.includes(toCurrency);

    const swapCurrencies = () => { setFromCurrency(toCurrency); setToCurrency(fromCurrency); };
    const togglePin = () => {
        setPinnedCurrencies((current) => current.includes(toCurrency) ? current.filter((code) => code !== toCurrency) : [...current, toCurrency]);
    };
    const selectQuickPair = (code) => setToCurrency(code);

    return (
        <div className={styles.converterPage}>
            <section className={styles.pageHeading}>
                <div><p className={styles.pageContext}><FaGlobe aria-hidden="true" /> CURRENCY CONVERTER</p><h1>Exchange with <span>confidence.</span></h1><p className={styles.intro}>Check your travel money against the latest daily reference rates.</p></div>
                <div className={styles.rateBadge}><span className={styles.liveDot} /><span>{isLoading ? "Updating daily rates" : rateError && !snapshot ? "Rate feed offline" : `Latest rate${dateText ? ` · ${dateText}` : ""}`}</span><button onClick={() => setRefreshId((current) => current + 1)} aria-label="Refresh exchange rates" title="Refresh exchange rates"><FaArrowsRotate aria-hidden="true" /></button></div>
            </section>

            <div className={styles.workspace}>
                <section className={styles.converterCard} id="converter" aria-labelledby="converter-heading">
                    <div className={styles.cardHeading}><div><p className={styles.cardLabel}>QUICK CONVERT</p><h2 id="converter-heading">How much do you need?</h2></div><button className={`${styles.pinButton} ${currentIsPinned ? styles.pinned : ""}`} onClick={togglePin} aria-pressed={currentIsPinned} aria-label={currentIsPinned ? `Unpin ${toCurrency}` : `Pin ${toCurrency}`}><FaStar aria-hidden="true" /> <span>{currentIsPinned ? "Pinned" : "Pin pair"}</span></button></div>

                    <div className={styles.currencyFields}>
                        <div className={styles.currencyField}>
                            <div className={styles.fieldHeading}><label htmlFor="from-amount">You have</label><span>FROM</span></div>
                            <div className={styles.amountBox}><input id="from-amount" type="number" min="0" step="any" value={amount} onChange={(event) => setAmount(event.target.value)} aria-label="Amount to convert" /><label className={styles.selectWrap}><span className={styles.visuallyHidden}>Currency you have</span><select value={fromCurrency} onChange={(event) => setFromCurrency(event.target.value)} aria-label="Currency you have">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select><span className={styles.selectChevron} aria-hidden="true">⌄</span></label></div>
                            <p className={styles.currencyName}>{currencyName(fromCurrency)}</p>
                        </div>
                        <button className={styles.swapButton} onClick={swapCurrencies} aria-label="Swap currencies" title="Swap currencies"><FaArrowRightArrowLeft aria-hidden="true" /></button>
                        <div className={`${styles.currencyField} ${styles.resultField}`}>
                            <div className={styles.fieldHeading}><label htmlFor="to-amount">You get</label><span>TO</span></div>
                            <div className={styles.amountBox}><input id="to-amount" readOnly value={converted === null ? "" : formatAmount(converted, toCurrency)} placeholder={isLoading ? "…" : "Rate unavailable"} aria-label="Converted amount" /><label className={styles.selectWrap}><span className={styles.visuallyHidden}>Currency you want</span><select value={toCurrency} onChange={(event) => setToCurrency(event.target.value)} aria-label="Currency you want">{currencies.map((currency) => <option key={currency.code} value={currency.code}>{currency.code}</option>)}</select><span className={styles.selectChevron} aria-hidden="true">⌄</span></label></div>
                            <p className={styles.currencyName}>{currencyName(toCurrency)}</p>
                        </div>
                    </div>

                    <div className={styles.quickAmounts}><span>Quick amount</span>{[100, 250, 500, 1000].map((value) => <button key={value} className={Number(amount) === value ? styles.amountSelected : ""} onClick={() => setAmount(String(value))}>{formatCurrency(value, fromCurrency)}</button>)}</div>

                    <div className={styles.rateSummary}>
                        <div><span className={styles.rateArrow}><FaArrowRightLong aria-hidden="true" /></span><p><strong>1 {fromCurrency} = {rate === null ? "--" : `${formatRate(rate)} ${toCurrency}`}</strong><span>{rateError && snapshot ? `Saved reference · ${dateText}` : snapshot?.date ? `Daily reference · ${dateText}` : isLoading ? "Fetching the latest reference rate" : "Choose a supported currency pair"}</span></p></div>
                        <span className={styles.rateType}>MID-MARKET</span>
                    </div>
                    {rateError && !snapshot && <p className={styles.errorMessage} role="status">Rates could not load. Check your connection and try refreshing.</p>}
                    {rateError && snapshot && <p className={styles.fallbackMessage} role="status">Using the last rates saved in this browser. Reconnect to update them.</p>}

                    {quickPins.length > 0 && <div className={styles.pinnedRow}><span>Pinned currencies</span><div>{quickPins.map((code) => <button key={code} onClick={() => selectQuickPair(code)} className={toCurrency === code ? styles.activePin : ""}>{code}<FaArrowUpRightFromSquare aria-hidden="true" /></button>)}</div></div>}
                </section>

                <aside className={styles.rateBoard} id="rate-board" aria-labelledby="rate-board-heading">
                    <div className={styles.boardHeading}><div><p className={styles.cardLabel}>TODAY'S BOARD</p><h2 id="rate-board-heading">Popular with travelers</h2></div><span className={styles.baseBadge}>1 {fromCurrency}</span></div>
                    <p className={styles.boardIntro}>Compare {fromCurrency} with common trip currencies.</p>
                    <ul className={styles.rateList}>{suggestedCodes.map((code, index) => <li key={code}><span className={`${styles.currencyMark} ${styles[`mark${index}`]}`}>{code.slice(0, 1)}</span><span className={styles.rateIdentity}><strong>{code}</strong><small>{currencyName(code)}</small></span><strong className={styles.boardRate}>{formatRate(snapshot.rates[code])}</strong><button onClick={() => setToCurrency(code)} aria-label={`Convert to ${code}`} className={styles.chooseRate}><FaArrowRightLong aria-hidden="true" /></button></li>)}</ul>
                    {!snapshot && <div className={styles.boardLoading}>{isLoading ? "Loading reference rates…" : "Rate board will appear when rates load."}</div>}
                    <a className={styles.sourceLink} href="https://frankfurter.dev/" target="_blank" rel="noreferrer">Rates by Frankfurter <FaArrowUpRightFromSquare aria-hidden="true" /></a>
                </aside>
            </div>

            <section className={styles.rateNotes} aria-label="About these rates"><article><span className={styles.noteNumber}>01</span><div><h3>Daily reference rates</h3><p>Rates come from the latest available banking day and update when new data is published.</p></div></article><article><span className={styles.noteNumber}>02</span><div><h3>Not a cash quote</h3><p>Your bank, card provider, or exchange desk may use a different rate or charge a fee.</p></div></article><article><span className={styles.noteNumber}>03</span><div><h3>Saved for your next check</h3><p>Recent public rates and pinned currencies are kept in this browser for offline reference.</p></div></article></section>
        </div>
    );
};

export default CurrencyConverter;
