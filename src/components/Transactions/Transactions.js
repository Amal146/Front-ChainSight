import React, { useState, useEffect } from "react";
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiBadge from "components/VuiBadge";
import { Alert, Modal, Button, Box, Divider, CircularProgress, Tooltip } from "@mui/material";
import Table from "examples/Tables/Table";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable"; // Import autoTable separately
import html2canvas from "html2canvas";
import Chart from 'chart.js/auto';

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
  const [showPremiumAlert, setShowPremiumAlert] = useState(false);
  const [txTypes, setTxTypes] = useState({}); // Store transaction type predictions
  const rowsPerPage = 20;
  const [fraudPredictions, setFraudPredictions] = useState({});
  const CONFIDENCE_THRESHOLDS = {
    HIGH_CONFIDENCE: 0.7, // 70%+ confidence - definite result
    MEDIUM_CONFIDENCE: 0.4, // 40-70% confidence - warning
    LOW_CONFIDENCE: 0.2, // Below 40% - needs manual review
  };

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=txlist&address=0xE11D08e4EA85dc79d63020d99f02f659B17F36DB&startblock=0&endblock=99999999&sort=desc&apikey=V8RHS7P2YNSAHUY92CXVANVQK8MIYK95UQ`
        );
        const data = await response.json();
        if (data.status === "1") {
          const processedTransactions = data.result.map((tx) => ({
            ...tx,
            isSuspicious: checkIfSuspicious(tx),
            riskLevel: calculateRiskLevel(tx),
          }));
          setTransactions(processedTransactions || []);

          // Fetch transaction types for the first page
          predictTransactionTypes(processedTransactions.slice(0, rowsPerPage));
          fetchFraudPredictions(processedTransactions.slice(0, rowsPerPage));
        } else {
          throw new Error(data.message || "Failed to fetch transactions");
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  const calculateTxFee = (tx) => {
    const gasPrice = parseInt(tx.gasPrice);
    const gasUsed = parseInt(tx.gasUsed);
    return (gasPrice * gasUsed) / 1e18; // Convert from wei to ETH
  };

  // Predict transaction types when page changes
  useEffect(() => {
    if (transactions.length > 0) {
      const startIdx = (page - 1) * rowsPerPage;
      const endIdx = page * rowsPerPage;
      predictTransactionTypes(transactions.slice(startIdx, endIdx));
      fetchFraudPredictions(transactions.slice(startIdx, endIdx));
    }
  }, [page, transactions]);

  const predictTransactionTypes = async (txs) => {
    try {
      const predictions = {};

      for (const tx of txs) {
        try {
          const timestamp = new Date(tx.timeStamp * 1000);
          const hour = timestamp.getHours();
          const dayOfWeek = timestamp.getDay();
          const month = timestamp.getMonth();

          // Calculate protocol (you'll need to implement your protocol detection logic)
          const protocol = protocol_mappings[tx.to?.toLowerCase()] || "other";

          // Prepare features exactly as your model expects
          const txFeatures = {
            value_eth: parseInt(tx.value) / 1e18,
            gas_cost_eth: (parseInt(tx.gasPrice) * parseInt(tx.gasUsed)) / 1e18,
            tx_fee_ratio:
              (parseInt(tx.gasPrice) * parseInt(tx.gasUsed)) / Math.max(parseInt(tx.value), 1),
            is_contract_tx: tx.input !== "0x" ? 1 : 0,
            input_length: tx.input?.length || 0,
            is_high_value: parseInt(tx.value) / 1e18 > 1 ? 1 : 0,
            is_low_value: parseInt(tx.value) / 1e18 < 0.01 ? 1 : 0,
            is_weekend: [0, 6].includes(dayOfWeek) ? 1 : 0,
            hour: hour,
            day_of_week: dayOfWeek,
            month: month + 1, // JavaScript months are 0-indexed
            time_of_day: getTimeOfDay(hour),
            is_defi: protocol_mappings[tx.to?.toLowerCase()] === "Uniswap" ? 1 : 0, // Example
            is_nft: protocol_mappings[tx.to?.toLowerCase()] === "OpenSea" ? 1 : 0, // Example
            protocol: protocol,
          };

          // Call your API
          const response = await fetch("https://classifiersserver.onrender.com/classify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(txFeatures),
          });

          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

          const data = await response.json();
          predictions[tx.hash] = {
            type: data.predicted_class, // "1", "2", etc.
            confidence: data.confidence, // 0.9978 (number)
            probabilities: data.probabilities, // { "0": 0.0003, "1": 0.9978, ... }
          };
        } catch (error) {
          console.error(`Error processing tx ${tx.hash}:`, error);
          predictions[tx.hash] = "Unknown";
        }
      }

      setTxTypes((prev) => ({ ...prev, ...predictions }));
    } catch (error) {
      console.error("Error in predictTransactionTypes:", error);
      // Fallback for all transactions if general error occurs
      const fallbackPredictions = {};
      txs.forEach((tx) => {
        fallbackPredictions[tx.hash] = "Unknown";
      });
      setTxTypes((prev) => ({ ...prev, ...fallbackPredictions }));
    }
  };

  // Helper function to match your model's time_of_day categories
  const getTimeOfDay = (hour) => {
    if (hour >= 0 && hour < 6) return "night";
    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    return "evening";
  };

  // You'll need to implement this based on your protocol detection
  const protocol_mappings = {
    "0x7a250d5630b4cf539739df2c5dacb4c659f2488d": "Uniswap",
    "0x1111111254fb6c44bac0bed2854e76f90643097d": "1inch",
    "0x00000000006c3852cbef3e08e8df289169ede581": "Seaport",
    "0xdac17f958d2ee523a2206206994597c13d831ec7": "USDT",
    "0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2": "WETH",
    "0x3fc91a3afd70395cd496c647d5a6cc9d4b2b7fad": "Uniswap V3",
    "0x881d40237659c251811cec9c364ef91dc08d300c": "Metamask Swap",
    "0xdef1c0ded9bec7f1a1670819833240f027b25eff": "0x Protocol",
    "0x7be8076f4ea4a4ad08075c2508e481d6c946d12b": "OpenSea",
  };

  const checkIfSuspicious = (tx) => {
    const valueInEth = parseInt(tx.value) / 1e18;
    const isFailed = tx.isError !== "0";
    const isVerySmallValue = valueInEth > 0 && valueInEth < 0.0001;
    const isContractCreation = tx.to === "";
    const isUnusualGas = parseInt(tx.gasPrice) > 200000000000; // 200 Gwei

    return isFailed || isVerySmallValue || isContractCreation || isUnusualGas;
  };

  const calculateRiskLevel = (tx) => {
    let score = 0;
    if (tx.isError !== "0") score += 30;
    if (parseInt(tx.value) / 1e18 < 0.0001) score += 20;
    if (tx.to === "") score += 25;
    if (parseInt(tx.gasPrice) > 200000000000) score += 25;

    if (score >= 50) return "High";
    if (score >= 30) return "Medium";
    return "Low";
  };

  const calculateRiskScore = (tx) => {
    let score = 0;
    if (tx.isError !== "0") score += 30;
    if (parseInt(tx.value) / 1e18 < 0.0001) score += 20;
    if (tx.to === "") score += 25;
    if (parseInt(tx.gasPrice) > 200000000000) score += 25;
    return score;
  };

  const getSuspiciousBadge = (isSuspicious, riskLevel, riskScore) => {
    const riskConfig = {
      High: {
        color: "error",
        icon: <WarningAmberIcon sx={{ fontSize: "16px", mr: 0.5 }} />,
        label: "High Risk",
        tooltip: "This transaction has multiple high-risk characteristics",
        gradient: "linear-gradient(135deg, #ff5252, #d32f2f)",
      },
      Medium: {
        color: "warning",
        icon: <InfoOutlinedIcon sx={{ fontSize: "16px", mr: 0.5 }} />,
        label: "Medium Risk",
        tooltip: "This transaction has some potentially risky characteristics",
        gradient: "linear-gradient(135deg, #ffb74d, #fb8c00)",
      },
      Low: {
        color: "success",
        icon: <CheckCircleOutlineIcon sx={{ fontSize: "16px", mr: 0.5 }} />,
        label: "Low Risk",
        tooltip: "This transaction appears normal",
        gradient: "linear-gradient(135deg, #66bb6a, #43a047)",
      },
    };

    const config = riskConfig[riskLevel] || riskConfig.Low;

    return (
      <Tooltip
        title={`${config.tooltip} | Risk Score: ${riskScore}/100`}
        arrow
        componentsProps={{
          tooltip: {
            sx: {
              bgcolor: "#1a1a2e",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            },
          },
        }}
      >
        <Box
          sx={{
            background: config.gradient,
            borderRadius: "12px",
            padding: "4px 12px",
            display: "inline-flex",
            alignItems: "center",
            boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
            transition: "transform 0.2s, box-shadow 0.2s",
            "&:hover": {
              transform: "translateY(-1px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            },
          }}
        >
          {config.icon}
          <VuiTypography
            variant="caption"
            sx={{
              color: "white",
              fontWeight: "bold",
              textShadow: "0 1px 2px rgba(0,0,0,0.2)",
            }}
          >
            {config.label}
          </VuiTypography>
        </Box>
      </Tooltip>
    );
  };

  const getStatusBadge = (tx) => {
    const status = tx.isError === "0" ? "success" : "error";
    const statusText = tx.isError === "0" ? "Success" : "Failed";

    return <VuiBadge variant="contained" color={status} badgeContent={statusText} container />;
  };

  const getTypeBadge = (txHash) => {
    // Get the saved data for this transaction
    const txData = txTypes[txHash] || {
      type: "loading",
      confidence: 0,
      probabilities: {},
    };

    // Map numbers to readable names
    const typeNames = {
      0: "ETH Transfer",
      1: "Token Transfer",
      2: "DeFi",
      3: "NFT",
      4: "Contract",
      5: "High Fee",
      loading: "Loading...",
    };

    const currentType = typeNames[txData.type] || "Unknown";

    // Colors for each type
    const colors = {
      "ETH Transfer": "info",
      "Token Transfer": "primary",
      DeFi: "success",
      NFT: "secondary",
      Contract: "warning",
      "High Fee": "error",
      Unknown: "default",
    };

    return (
      <Tooltip
        title={
          <div>
            <strong>{currentType}</strong>
            <p>Confidence: {(txData.confidence * 100).toFixed(1)}%</p>
            <div>
              {Object.entries(txData.probabilities).map(([type, prob]) => (
                <div key={type}>
                  {typeNames[type]}: {(prob * 100).toFixed(2)}%
                </div>
              ))}
            </div>
          </div>
        }
        arrow
      >
        <VuiBadge
          color={colors[currentType]}
          badgeContent={`${currentType} (${(txData.confidence * 100).toFixed(0)}%)`}
        />
      </Tooltip>
    );
  };

  // Fetch fraud predictions for the first page of transactions

  const handleLowConfidence = (tx) => {
    // You can:
    // 1. Flag for manual review
    // 2. Show a modal with details
    // 3. Send for additional analysis
    console.log(`Low confidence prediction for TX ${tx.hash}, needs manual review`);
    setSelectedTx(tx);
    setOpenModal(true);
  };
  const fetchFraudPredictions = async (txs) => {
    try {
      const response = await fetch("https://classifiersserver.onrender.com/fraud_predict", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: "0xE11D08e4EA85dc79d63020d99f02f659B17F36DB",
          transactions: txs.map((tx) => ({
            blockNumber: tx.blockNumber,
            blockHash: tx.blockHash,
            timeStamp: tx.timeStamp,
            hash: tx.hash,
            nonce: tx.nonce,
            transactionIndex: tx.transactionIndex,
            from: tx.from,
            to: tx.to,
            value: tx.value,
            gas: tx.gas,
            gasPrice: tx.gasPrice,
            input: tx.input,
            methodId: tx.methodId,
            functionName: tx.functionName,
            contractAddress: tx.contractAddress,
            cumulativeGasUsed: tx.cumulativeGasUsed,
            txreceipt_status: tx.txreceipt_status,
            gasUsed: tx.gasUsed,
            confirmations: tx.confirmations,
            isError: tx.isError,
          })),
        }),
      });

      const data = await response.json();
      const predictions = {};
      data.results.forEach((result) => {
        predictions[result.tx_hash] = {
          prediction: result.prediction,
          probability: result.probability_class_0,
          label: result.label,
        };
      });
      setFraudPredictions(predictions);
    } catch (error) {
      console.error("Error fetching fraud predictions:", error);
    }
  };

  const getFraudBadge = (txHash) => {
    const prediction = fraudPredictions[txHash];

    if (!prediction) {
      return <VuiBadge variant="contained" color="secondary" badgeContent="Loading..." container />;
    }

    if (prediction === "error") {
      return <VuiBadge variant="contained" color="warning" badgeContent="Error" container />;
    }

    const confidence = prediction.probability;
    const isFraud = prediction.prediction === 1;

    // Handle low confidence cases
    if (confidence < CONFIDENCE_THRESHOLDS.LOW_CONFIDENCE) {
      return (
        <Tooltip title={`Low confidence (${(confidence * 100).toFixed(1)}%) - Needs review`} arrow>
          <VuiBadge
            variant="contained"
            color="warning"
            badgeContent={
              <Box display="flex" alignItems="center">
                <HelpOutlineIcon sx={{ fontSize: "16px", mr: 0.5 }} />
                Review Needed
              </Box>
            }
            container
          />
        </Tooltip>
      );
    }

    // Handle medium confidence
    if (confidence < CONFIDENCE_THRESHOLDS.HIGH_CONFIDENCE) {
      return (
        <Tooltip title={`Medium confidence (${(confidence * 100).toFixed(1)}%)`} arrow>
          <VuiBadge
            variant="contained"
            color={isFraud ? "warning" : "info"}
            badgeContent={
              <Box display="flex" alignItems="center">
                {isFraud ? (
                  <WarningAmberIcon sx={{ fontSize: "16px", mr: 0.5 }} />
                ) : (
                  <InfoOutlinedIcon sx={{ fontSize: "16px", mr: 0.5 }} />
                )}
                {isFraud ? "Potential Fraud" : "Likely Safe"}
              </Box>
            }
            container
          />
        </Tooltip>
      );
    }

    // High confidence cases
    return (
      <Tooltip title={`High confidence (${(confidence * 100).toFixed(1)}%)`} arrow>
        <VuiBadge
          variant="contained"
          color={isFraud ? "error" : "success"}
          badgeContent={
            <Box display="flex" alignItems="center">
              {isFraud ? (
                <WarningAmberIcon sx={{ fontSize: "16px", mr: 0.5 }} />
              ) : (
                <CheckCircleOutlineIcon sx={{ fontSize: "16px", mr: 0.5 }} />
              )}
              {isFraud ? "Fraudulent" : "Legitimate"}
            </Box>
          }
          container
        />
      </Tooltip>
    );
  };

  // Handle tax report generation
  const handleGenerateTaxReport = async () => {
    try {
      setShowPremiumAlert(false);

      // Show loading state
      const loadingAlert = (
        <Alert
          severity="info"
          icon={<CircularProgress size={24} sx={{ color: "#4fc3f7" }} />}
          sx={{
            mt: 2,
            backgroundColor: "rgba(187, 134, 252, 0.1)",
            color: "#bb86fc",
            border: "1px solid #bb86fc",
          }}
        >
          Generating comprehensive tax report...
        </Alert>
      );

      setShowPremiumAlert(loadingAlert);

      // Generate the PDF (this might take a few seconds)
      await generatePDFReport();
    } catch (error) {
      console.error("Error generating PDF:", error);
      setShowPremiumAlert(
        <Alert
          severity="error"
          sx={{
            mt: 2,
            backgroundColor: "rgba(239, 154, 154, 0.1)",
            color: "#ef9a9a",
            border: "1px solid #ef9a9a",
          }}
        >
          Error generating report: {error.message}
        </Alert>
      );
    }
  };

  const handleExplainClick = async (tx) => {
    setSelectedTx(tx);
    setOpenModal(true);
    setExplaining(true);
    setExplanation(null);

    try {
      const response = await fetch("https://chainsightbot.onrender.com/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ txHash: tx.hash }),
      });

      const data = await response.json();
      setExplanation(data);
    } catch (err) {
      setExplanation({ summary: "Error fetching explanation." });
    } finally {
      setExplaining(false);
    }
  };

  const formatAddress = (address) => {
    if (!address) return "N/A";
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const paginatedTransactions = transactions.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const generatePDFReport = async () => {
  setShowPremiumAlert(false);

  // Create a new PDF document
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  // Add title page
  doc.setFontSize(24);
  doc.setTextColor(40, 53, 147);
  doc.text("Transaction Tax Report", 105, 30, { align: "center" });

  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 105, 40, { align: "center" });

  doc.setFontSize(12);
  doc.text("Address: 0xE11D08e4EA85dc79d63020d99f02f659B17F36DB", 105, 50, { align: "center" });

  // Add a new page for the summary
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(40, 53, 147);
  doc.text("Transaction Summary", 20, 20);

  // Summary table
  const summaryStats = calculateSummaryStatistics();
  autoTable(doc, {
    startY: 30,
    head: [["Metric", "Value"]],
    body: [
      ["Total Transactions", summaryStats.totalTransactions],
      ["Successful Transactions", summaryStats.successfulTransactions],
      ["Failed Transactions", summaryStats.failedTransactions],
      ["Total ETH Volume", `${summaryStats.totalVolumeETH} ETH`],
      ["Total Gas Fees", `${summaryStats.totalGasFeesETH} ETH`],
      ["Average Transaction Value", `${summaryStats.avgTxValueETH} ETH`],
      ["High Risk Transactions", summaryStats.highRiskCount],
      ["Potential Fraud", summaryStats.potentialFraudCount],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [40, 53, 147],
      textColor: 255,
    },
  });

  // Create a chart for transaction types
  const chartData = {
    labels: ['ETH Transfer', 'Token Transfer', 'DeFi', 'NFT', 'Contract', 'High Fee'],
    datasets: [{
      label: 'Transaction Types Distribution',
      data: calculateTransactionTypeDistribution(),
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(54, 162, 235, 0.6)',
        'rgba(153, 102, 255, 0.6)',
        'rgba(255, 159, 64, 0.6)',
        'rgba(255, 99, 132, 0.6)',
        'rgba(255, 206, 86, 0.6)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(54, 162, 235, 1)',
        'rgba(153, 102, 255, 1)',
        'rgba(255, 159, 64, 1)',
        'rgba(255, 99, 132, 1)',
        'rgba(255, 206, 86, 1)'
      ],
      borderWidth: 1
    }]
  };

  // Create a temporary canvas element for the chart
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 400;
  const ctx = canvas.getContext('2d');
  
  // Create the chart
  new Chart(ctx, {
    type: 'bar',
    data: chartData,
    options: {
      responsive: false,
      plugins: {
        legend: {
          position: 'top',
        },
        title: {
          display: true,
          text: 'Transaction Types Distribution'
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });

  // Convert chart to image
  const chartImage = canvas.toDataURL('image/png');

  // Add chart page
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(40, 53, 147);
  doc.text("Transaction Types Distribution", 20, 20);
  doc.addImage(chartImage, 'PNG', 20, 30, 170, 100); // Adjust size and position as needed

  // Add tax estimation page
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(40, 53, 147);
  doc.text("Tax Liability Estimation", 20, 20);

  const taxEstimation = estimateTaxLiabilities();
  autoTable(doc, {
    startY: 30,
    head: [["Tax Category", "ETH Amount", "USD Value"]],
    body: [
      ["Capital Gains", taxEstimation.capitalGainsETH, `$${taxEstimation.capitalGainsUSD}`],
      ["Income", taxEstimation.incomeETH, `$${taxEstimation.incomeUSD}`],
      ["Total Estimated Liability", taxEstimation.totalETH, `$${taxEstimation.totalUSD}`],
      ["Potentially Deductible Fees", taxEstimation.gasFeesETH, `$${taxEstimation.gasFeesUSD}`],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [40, 53, 147],
      textColor: 255,
    },
  });

  // Add transaction details page
  doc.addPage();
  doc.setFontSize(18);
  doc.setTextColor(40, 53, 147);
  doc.text("Transaction Details", 20, 20);

  // Prepare transaction data for the table
  const txData = paginatedTransactions.map((tx) => [
    new Date(tx.timeStamp * 1000).toLocaleDateString(),
    formatAddress(tx.hash),
    formatAddress(tx.from),
    formatAddress(tx.to || "Contract Creation"),
    `${(parseInt(tx.value) / 1e18)} ETH`,
    txTypes[tx.hash]?.type || "Unknown",
    tx.isError === "0" ? "Success" : "Failed",
    tx.riskLevel,
    fraudPredictions[tx.hash]?.label || "Unknown",
    `${calculateTxFee(tx).toFixed(6)} ETH`,
  ]);

  autoTable(doc, {
    startY: 30,
    head: [
      [
        "Date",
        "Txn Hash",
        "From",
        "To",
        "Value",
        "Type",
        "Status",
        "Risk",
        "Fraud",
        "Tx Fee",
      ],
    ],
    body: txData,
    theme: "grid",
    headStyles: {
      fillColor: [40, 53, 147],
      textColor: 255,
    },
    styles: {
      fontSize: 7,
      cellWidth: "wrap",
    },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 25 },
      2: { cellWidth: 25 },
      3: { cellWidth: 25 },
      4: { cellWidth: 20 },
      5: { cellWidth: 20 },
      6: { cellWidth: 15 },
      7: { cellWidth: 15 },
      8: { cellWidth: 15 },
      9: { cellWidth: 15 },
    },
    margin: { top: 30 },
  });

  // Add disclaimer page
  doc.addPage();
  doc.setFontSize(16);
  doc.setTextColor(40, 53, 147);
  doc.text("Important Disclaimers", 20, 20);

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const disclaimerText = [
    "This report is provided for informational purposes only and does not constitute tax advice.",
    "The tax estimations are based on simplified calculations and may not reflect your actual tax liability.",
    "Cryptocurrency tax laws vary by jurisdiction and are subject to change.",
    "You should consult with a qualified tax professional for advice specific to your situation.",
    "The transaction risk assessments are based on heuristics and machine learning models that may not be 100% accurate.",
  ];

  let yPosition = 30;
  disclaimerText.forEach((text) => {
    doc.text(text, 20, yPosition, { maxWidth: 170 });
    yPosition += 10;
  });

  // Save the PDF
  doc.save(`Transaction_Tax_Report_${new Date().toISOString().split("T")[0]}.pdf`);
};

// Add this helper function to calculate transaction type distribution
const calculateTransactionTypeDistribution = () => {
  const typeCounts = {
    'ETH Transfer': 0,
    'Token Transfer': 0,
    'DeFi': 0,
    'NFT': 0,
    'Contract': 0,
    'High Fee': 0
  };

  transactions.forEach(tx => {
    const type = txTypes[tx.hash]?.type;
    switch(type) {
      case '0': typeCounts['ETH Transfer']++; break;
      case '1': typeCounts['Token Transfer']++; break;
      case '2': typeCounts['DeFi']++; break;
      case '3': typeCounts['NFT']++; break;
      case '4': typeCounts['Contract']++; break;
      case '5': typeCounts['High Fee']++; break;
      default: break;
    }
  });

  return [
    typeCounts['ETH Transfer'],
    typeCounts['Token Transfer'],
    typeCounts['DeFi'],
    typeCounts['NFT'],
    typeCounts['Contract'],
    typeCounts['High Fee']
  ];
};

  const calculateSummaryStatistics = () => {
    const totalTransactions = transactions.length;
    const successfulTransactions = transactions.filter((tx) => tx.isError === "0").length;
    const failedTransactions = totalTransactions - successfulTransactions;

    const totalVolumeETH = transactions
      .reduce((sum, tx) => sum + parseInt(tx.value) / 1e18, 0)
      .toFixed(4);

    const totalGasFeesETH = transactions
      .reduce((sum, tx) => sum + calculateTxFee(tx), 0)
      .toFixed(6);

    const avgTxValueETH = (parseFloat(totalVolumeETH) / totalTransactions).toFixed(6);

    const highRiskCount = transactions.filter((tx) => tx.riskLevel === "High").length;

    const potentialFraudCount = Object.values(fraudPredictions).filter(
      (pred) => pred.prediction === 1 && pred.probability > CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE
    ).length;

    return {
      totalTransactions,
      successfulTransactions,
      failedTransactions,
      totalVolumeETH,
      totalGasFeesETH,
      avgTxValueETH,
      highRiskCount,
      potentialFraudCount,
    };
  };

  const estimateTaxLiabilities = () => {
    // Simplified tax estimation (in a real app, this would be more sophisticated)
    const ethPrice = 2000; // Example ETH price in USD - in a real app, fetch this

    // Calculate total received ETH (simplified)
    const receivedETH = paginatedTransactions
      .filter((tx) => tx.isError === "0")
      .reduce((sum, tx) => sum + parseInt(tx.value) / 1e18, 0);

    // Calculate total sent ETH (simplified)
    const sentETH = 0; // In a real app, you'd need to track outgoing transactions

    // Simplified capital gains calculation
    const capitalGainsETH = (receivedETH * 0.15).toFixed(6); // 15% of received
    const capitalGainsUSD = (capitalGainsETH * ethPrice).toFixed(2);

    // Simplified income calculation (e.g., for mining rewards, etc.)
    const incomeETH = (receivedETH * 0.05).toFixed(6); // 5% as income
    const incomeUSD = (incomeETH * ethPrice).toFixed(2);

    // Gas fees (potentially deductible)
    const gasFeesETH = paginatedTransactions
      .reduce((sum, tx) => sum + calculateTxFee(tx), 0)
      .toFixed(6);
    const gasFeesUSD = (gasFeesETH * ethPrice).toFixed(2);

    const totalETH = (parseFloat(capitalGainsETH) + parseFloat(incomeETH)).toFixed(6);
    const totalUSD = (parseFloat(capitalGainsUSD) + parseFloat(incomeUSD)).toFixed(2);

    return {
      capitalGainsETH,
      capitalGainsUSD,
      incomeETH,
      incomeUSD,
      gasFeesETH,
      gasFeesUSD,
      totalETH,
      totalUSD,
    };
  };

  const generateSimpleAnalysis = (tx) => {
    const valueETH = parseInt(tx.value) / 1e18;
    const feeETH = calculateTxFee(tx);
    const feePercentage = (feeETH / valueETH) * 100;

    let analysis = "";

    // Value analysis
    if (valueETH > 1) {
      analysis += `This was a high-value transaction (${valueETH.toFixed(4)} ETH). `;
    } else if (valueETH < 0.01) {
      analysis += `This was a low-value transaction (${valueETH.toFixed(6)} ETH). `;
    }

    // Fee analysis
    if (feePercentage > 10) {
      analysis += `The transaction fee was unusually high (${feePercentage.toFixed(
        2
      )}% of the transaction value). `;
    }

    // Risk analysis
    if (tx.riskLevel === "High") {
      analysis += "This transaction has multiple high-risk characteristics. ";
    } else if (tx.riskLevel === "Medium") {
      analysis += "This transaction shows some potentially risky patterns. ";
    }

    // Fraud prediction
    const fraudPred = fraudPredictions[tx.hash];
    if (
      fraudPred?.prediction === 1 &&
      fraudPred.probability > CONFIDENCE_THRESHOLDS.MEDIUM_CONFIDENCE
    ) {
      analysis += "Our system detected potential fraudulent activity in this transaction. ";
    }

    // Status analysis
    if (tx.isError !== "0") {
      analysis += "This transaction failed to execute on the blockchain. ";
    }

    // Protocol analysis
    const protocol = protocol_mappings[tx.to?.toLowerCase()];
    if (protocol) {
      analysis += `This transaction interacted with ${protocol}. `;
    }

    // Tax implications
    if (valueETH > 0.1) {
      analysis += "This transaction may have significant tax implications. ";
    }

    if (analysis === "") {
      analysis =
        "This transaction appears to be a standard transfer with no unusual characteristics.";
    }

    return analysis;
  };

  return (
    <VuiBox
      bgColor="rgba(16, 18, 37, 0.81)"
      boxShadow="0 4px 20px rgba(0, 0, 0, 0.3)"
      sx={{ borderRadius: "12px" }}
      p={3}
      mb={3}
      mt={3}
    >
      <VuiTypography variant="h3" fontWeight="bold" color="white" mb={3} fontSize="x-large">
        Recent Transactions
      </VuiTypography>

      {loading ? (
        <VuiBox display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress sx={{ color: "#4fc3f7" }} />
        </VuiBox>
      ) : error ? (
        <VuiBox
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="200px"
          p={3}
          textAlign="center"
        >
          <ErrorOutlineIcon sx={{ color: "#ef9a9a", fontSize: "3rem", mb: 2 }} />
          <VuiTypography variant="h6" color="error" fontWeight="500">
            Error Loading Transactions
          </VuiTypography>
          <VuiTypography variant="body2" color="text" mt={1}>
            {error}
          </VuiTypography>
        </VuiBox>
      ) : (
        <>
          <Table
            columns={[
              { name: "Txn Hash", align: "left" },
              { name: "From", align: "left" },
              { name: "To", align: "left" },
              { name: "Value", align: "center" },
              { name: "Type", align: "center" },
              { name: "Status", align: "center" },
              { name: "Risk", align: "center" },
              { name: "Fraud", align: "center" },
              { name: "Tx Fee", align: "center" },
              { name: "Date", align: "center" },
              { name: "Actions", align: "center" },
            ]}
            rows={paginatedTransactions.map((tx) => ({
              "Txn Hash": (
                <Tooltip title={tx.hash} arrow>
                  <VuiTypography variant="caption" color="white" fontWeight="medium">
                    {formatAddress(tx.hash)}
                  </VuiTypography>
                </Tooltip>
              ),
              From: (
                <Tooltip title={tx.from} arrow>
                  <VuiTypography variant="caption" color="white" fontWeight="medium">
                    {formatAddress(tx.from)}
                  </VuiTypography>
                </Tooltip>
              ),
              To: (
                <Tooltip title={tx.to || "Contract Creation"} arrow>
                  <VuiTypography variant="caption" color="white" fontWeight="medium">
                    {tx.to ? formatAddress(tx.to) : "Contract Creation"}
                  </VuiTypography>
                </Tooltip>
              ),
              Value: (
                <VuiTypography variant="caption" color="white" fontWeight="medium">
                  {(parseInt(tx.value) / 1e18).toFixed(6)} ETH
                </VuiTypography>
              ),
              Type: getTypeBadge(tx.hash),
              Status: getStatusBadge(tx),
              Risk: getSuspiciousBadge(tx.isSuspicious, tx.riskLevel, calculateRiskScore(tx), tx),
              Fraud: getFraudBadge(tx.hash),
              Date: (
                <VuiTypography variant="caption" color="white" fontWeight="medium">
                  {new Date(tx.timeStamp * 1000).toLocaleString()}
                </VuiTypography>
              ),
              "Tx Fee": (
                <VuiTypography variant="caption" color="white" fontWeight="medium">
                  {calculateTxFee(tx).toFixed(6)} ETH
                </VuiTypography>
              ),

              Actions: (
                <>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => handleExplainClick(tx)}
                    sx={{ mr: 1 /* ... existing styles */ }}
                  >
                    Explain
                  </Button>
                  {/* {fraudPredictions[tx.hash]?.probability <
                    CONFIDENCE_THRESHOLDS.LOW_CONFIDENCE && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => handleLowConfidence(tx)}
                      sx={{ color: "#ff9800", borderColor: "#ff9800" }}
                    >
                      Review
                    </Button>
                  )} */}
                </>
              ),
            }))}
          />

          <VuiBox mt={3} display="flex" justifyContent="space-between" alignItems="center">
            <div>
              <Button
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                disabled={page === 1}
                sx={{ mr: 1 }}
              >
                Previous
              </Button>
              <Button
                onClick={() => setPage((p) => p + 1)}
                disabled={page * rowsPerPage >= transactions.length}
              >
                Next
              </Button>
            </div>

            <VuiTypography variant="caption" color="text">
              Page {page} - Showing {paginatedTransactions.length} of {transactions.length}{" "}
              transactions
            </VuiTypography>

            <Button
              variant="contained"
              startIcon={<ReceiptLongIcon />}
              onClick={handleGenerateTaxReport}
              sx={{
                backgroundColor: "#bb86fc",
                color: "#121212",
                "&:hover": {
                  backgroundColor: "#9a67ea",
                },
              }}
            >
              Generate Tax Report
            </Button>
          </VuiBox>

          {showPremiumAlert && (
            <Alert
              severity="info"
              icon={<InfoOutlinedIcon />}
              sx={{
                mt: 2,
                backgroundColor: "rgba(187, 134, 252, 0.1)",
                color: "#bb86fc",
                border: "1px solid #bb86fc",
              }}
            >
              Tax reporting features require a premium subscription. Upgrade now for comprehensive
              tax analysis and reporting tools.
            </Alert>
          )}
        </>
      )}

      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: "80vw",
            maxWidth: "1200px",
            height: "80vh",
            bgcolor: "#1a1a2e",
            color: "#e0e0e0",
            boxShadow: 24,
            p: 4,
            borderRadius: 2,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <Box
            sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}
          >
            <VuiTypography variant="h5" sx={{ color: "#4fc3f7", fontWeight: "bold" }}>
              🧠 Transaction Analysis
            </VuiTypography>
            <VuiTypography variant="caption" color="text">
              {selectedTx?.hash && formatAddress(selectedTx.hash)}
            </VuiTypography>
          </Box>

          <Box
            sx={{
              flex: 1,
              overflowY: "auto",
              pr: 2,
              "&::-webkit-scrollbar": {
                width: "8px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#3f51b5",
                borderRadius: "4px",
              },
              "&::-webkit-scrollbar-track": {
                backgroundColor: "#1a1a2e",
              },
            }}
          >
            {explaining ? (
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  height: "100%",
                  minHeight: "200px",
                }}
              >
                <CircularProgress
                  sx={{
                    color: "#4fc3f7",
                    width: "60px !important",
                    height: "60px !important",
                  }}
                />
              </Box>
            ) : explanation && explanation.interpretation ? (
              <Box
                sx={{
                  backgroundColor: "#1a1a2e",
                  padding: 3,
                  borderRadius: 3,
                  borderLeft: "4px solid #3f51b5",
                  boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
                  "& p": {
                    marginBottom: 2,
                    color: "#e0e0e0",
                    fontSize: "1rem",
                    lineHeight: 1.7,
                  },
                  "& strong": {
                    color: "#4fc3f7",
                    fontWeight: 600,
                  },
                  "& em": {
                    color: "#81c784",
                    fontStyle: "italic",
                    fontWeight: 500,
                  },
                  "& ul": {
                    paddingLeft: 3,
                    marginBottom: 2,
                    listStyleType: "none",
                  },
                  "& li": {
                    marginBottom: 1.5,
                    position: "relative",
                    paddingLeft: "1.5rem",
                    "&:before": {
                      content: '"•"',
                      color: "#4fc3f7",
                      position: "absolute",
                      left: 0,
                      fontSize: "1.5rem",
                      lineHeight: "1rem",
                    },
                  },
                  "& h2, & h3, & h4, & h5, & h6": {
                    color: "#bb86fc",
                    marginTop: "1.5rem",
                    marginBottom: "1rem",
                  },
                }}
              >
                <VuiTypography
                  variant="h5"
                  sx={{
                    color: "#bb86fc",
                    mb: 2,
                    fontWeight: 600,
                  }}
                >
                  {explanation.interpretation.summary}
                </VuiTypography>

                <Divider
                  sx={{
                    bgcolor: "rgba(63, 81, 181, 0.5)",
                    mb: 3,
                    height: "1px",
                  }}
                />

                <VuiTypography
                  variant="body1"
                  sx={{
                    whiteSpace: "pre-wrap",
                    lineHeight: 1.7,
                    "& a": {
                      color: "#4fc3f7",
                      textDecoration: "underline",
                      "&:hover": {
                        color: "#bb86fc",
                      },
                    },
                  }}
                >
                  {explanation.interpretation.interpretation.split("\n\n").map((paragraph, i) => (
                    <React.Fragment key={i}>
                      {paragraph.startsWith("**") ? (
                        <VuiTypography
                          component="div"
                          variant="h6"
                          sx={{
                            color: "#bb86fc",
                            mt: i > 0 ? 3 : 0,
                            mb: 1.5,
                            fontWeight: 600,
                          }}
                        >
                          {paragraph.replace(/\*\*/g, "")}
                        </VuiTypography>
                      ) : (
                        <>
                          {paragraph}
                          <br />
                          <br />
                        </>
                      )}
                    </React.Fragment>
                  ))}
                </VuiTypography>

                {explanation.interpretation.disclaimer && (
                  <Box
                    sx={{
                      mt: 4,
                      p: 2,
                      backgroundColor: "rgba(239, 154, 154, 0.1)",
                      borderLeft: "3px solid #ef9a9a",
                      borderRadius: "4px",
                    }}
                  >
                    <VuiTypography
                      variant="body2"
                      sx={{
                        color: "#ef9a9a",
                        fontStyle: "italic",
                      }}
                    >
                      {explanation.interpretation.disclaimer}
                    </VuiTypography>
                  </Box>
                )}
              </Box>
            ) : (
              <Box
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  minHeight: "200px",
                  p: 3,
                  textAlign: "center",
                }}
              >
                <VuiTypography
                  variant="h6"
                  sx={{
                    color: "#ef9a9a",
                    fontWeight: 500,
                  }}
                >
                  No interpretation available
                </VuiTypography>
                <VuiTypography
                  variant="body2"
                  sx={{
                    color: "#b0bec5",
                    mt: 1,
                  }}
                >
                  Please check the transaction hash or try again later
                </VuiTypography>
              </Box>
            )}
          </Box>
        </Box>
      </Modal>
    </VuiBox>
  );
};

export default Transactions;