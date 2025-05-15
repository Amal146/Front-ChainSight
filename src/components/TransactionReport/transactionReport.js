import { useState, useEffect } from "react";

// 👉 Replace with your actual Etherscan API key
const ETHERSCAN_API_KEY = "V8RHS7P2YNSAHUY92CXVANVQK8MIYK95UQ";

// ✅ 1. Fetch wallet transactions from Etherscan
async function fetchTransactions(address) {
  const url = `https://api.etherscan.io/api?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&sort=desc&apikey=V8RHS7P2YNSAHUY92CXVANVQK8MIYK95UQ`;
  const res = await fetch(url);
  const data = await res.json();

  if (data.status !== "1") {
    throw new Error(data.message || "Failed to fetch transactions");
  }

  return data.result;
}

// ✅ 2. Fetch known scam addresses from CryptoScamDB
async function fetchKnownScamAddresses() {
  const res = await fetch("https://cryptoscamdb.org/api/v1/addresses");
  const data = await res.json();
  return Object.keys(data.result); // return an array of addresses
}

// ✅ 3. Analyze transactions
function detectSuspicious(transactions, scamList) {
  return transactions.map((tx) => {
    const issues = [];

    if (scamList.includes(tx.to.toLowerCase())) {
      issues.push("Sent to known scam address");
    }

    const ethValue = parseFloat(tx.value) / 1e18;
    if (ethValue > 10) {
      issues.push("High-value transaction");
    }

    return {
      ...tx,
      ethValue,
      issues,
      isSuspicious: issues.length > 0,
    };
  });
}

// ✅ 4. React Component
export default function TransactionReport({ walletAddress }) {
  const [report, setReport] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scamCount, setScamCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError("");
      try {
        const [txs, scams] = await Promise.all([
          fetchTransactions(walletAddress),
          fetchKnownScamAddresses(),
        ]);

        const normalizedScams = scams.map((addr) => addr.toLowerCase());
        const flagged = detectSuspicious(txs, normalizedScams);
        setReport(flagged);
        setScamCount(flagged.filter((tx) => tx.isSuspicious).length);
      } catch (err) {
        console.error(err);
        setError("Error loading data. Check wallet address or internet.");
      }
      setLoading(false);
    }

    if (walletAddress) loadData();
  }, [walletAddress]);

  if (loading) return <p>⏳ Loading...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "20px" }}>
      <h3>🧾 Transaction Report for <code>{walletAddress}</code></h3>
      <p>🚨 <strong>{scamCount}</strong> suspicious transaction(s) found</p>

      {report.slice(0, 10).map((tx, idx) => (
        <div key={idx} style={{ border: "1px solid #ccc", margin: "10px 0", padding: "10px", borderRadius: "5px" }}>
          <p><strong>Hash:</strong> {tx.hash.slice(0, 20)}...</p>
          <p><strong>Date:</strong> {new Date(tx.timeStamp * 1000).toLocaleString()}</p>
          <p><strong>From:</strong> {tx.from}</p>
          <p><strong>To:</strong> {tx.to}</p>
          <p><strong>Value:</strong> {tx.ethValue.toFixed(4)} ETH</p>
          {tx.issues.length > 0 ? (
            <p style={{ color: "red" }}>⚠️ Issues: {tx.issues.join(", ")}</p>
          ) : (
            <p style={{ color: "green" }}>✅ No issues</p>
          )}
        </div>
      ))}
    </div>
  );
}
