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
          const response = await fetch("http://127.0.0.1:8000/predict", {
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

  const getSuspiciousBadge = (isSuspicious, riskLevel) => {
    const colors = {
      High: "error",
      Medium: "warning",
      Low: "success",
    };

    const icons = {
      High: <WarningAmberIcon sx={{ fontSize: "16px", mr: 0.5 }} />,
      Medium: <InfoOutlinedIcon sx={{ fontSize: "16px", mr: 0.5 }} />,
      Low: <CheckCircleOutlineIcon sx={{ fontSize: "16px", mr: 0.5 }} />,
    };

    return (
      <Tooltip title={`Risk Level: ${riskLevel}`} arrow>
        <VuiBadge
          variant="contained"
          color={colors[riskLevel]}
          badgeContent={
            <Box display="flex" alignItems="center">
              {icons[riskLevel]}
              {riskLevel} Risk
            </Box>
          }
          container
        />
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

  const handleGenerateTaxReport = () => {
    setShowPremiumAlert(true);
    setTimeout(() => setShowPremiumAlert(false), 5000);
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
              Risk: getSuspiciousBadge(tx.isSuspicious, tx.riskLevel),
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
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => handleExplainClick(tx)}
                  sx={{
                    color: "#61dafb",
                    borderColor: "#61dafb",
                    "&:hover": {
                      backgroundColor: "rgba(97, 218, 251, 0.1)",
                      borderColor: "#4fc3f7",
                    },
                  }}
                >
                  Explain
                </Button>
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
