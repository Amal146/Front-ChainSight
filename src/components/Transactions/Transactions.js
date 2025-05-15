import React, { useState, useEffect } from "react";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiBadge from "components/VuiBadge";
import { Alert, Modal, Button, Box, Divider, CircularProgress } from "@mui/material";
// Vision UI Dashboard React examples
import Table from "examples/Tables/Table";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ReceiptLongIcon from "@mui/icons-material/ReceiptLong";

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
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=txlist&address=0x7e2a2FA2a064F693f0a55C5639476d913Ff12D05&startblock=0&endblock=99999999&sort=desc&apikey=V8RHS7P2YNSAHUY92CXVANVQK8MIYK95UQ`
        );
        const data = await response.json();
        if (data.status === "1") {
          setTransactions(data.result || []);
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

  const paginatedTransactions = transactions.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  const formatAddress = (address) => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  const getStatusBadge = (tx) => {
    const status = tx.isError === "0" ? "success" : "error";
    const statusText = tx.isError === "0" ? "Success" : "Failed";

    return <VuiBadge variant="contained" color={status} badgeContent={statusText} container />;
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
        <VuiBox display="flex" justifyContent="center">
          <VuiTypography variant="body2" color="text">
            Loading...
          </VuiTypography>
        </VuiBox>
      ) : error ? (
        <VuiTypography variant="body2" color="error">
          Error: {error}
        </VuiTypography>
      ) : (
        <Table
          columns={[
            { name: "hash", align: "left" },
            { name: "from", align: "left" },
            { name: "to", align: "left" },
            { name: "value", align: "center" },
            { name: "status", align: "center" },
            { name: "timestamp", align: "center" },
            { name: "explain", align: "center" },
          ]}
          rows={paginatedTransactions.map((tx) => ({
            hash: (
              <VuiTypography variant="caption" color="white" fontWeight="medium">
                {formatAddress(tx.hash)}
              </VuiTypography>
            ),
            from: (
              <VuiTypography variant="caption" color="white" fontWeight="medium">
                {formatAddress(tx.from)}
              </VuiTypography>
            ),
            to: (
              <VuiTypography variant="caption" color="white" fontWeight="medium">
                {formatAddress(tx.to)}
              </VuiTypography>
            ),
            value: (
              <VuiTypography variant="caption" color="white" fontWeight="medium">
                {(parseInt(tx.value) / 1e18).toFixed(6)} ETH
              </VuiTypography>
            ),
            status: getStatusBadge(tx),
            timestamp: (
              <VuiTypography variant="caption" color="white" fontWeight="medium">
                {new Date(tx.timeStamp * 1000).toLocaleDateString()}
              </VuiTypography>
            ),
            explain: (
              <Button
                variant="outlined"
                size="small"
                onClick={() => handleExplainClick(tx)}
                style={{ color: "#61dafb", borderColor: "#61dafb" }}
              >
                Explain
              </Button>
            ),
          }))}
        />
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
              🧠 Transaction Explanation
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
      <VuiBox mt={3} display="flex" justifyContent="flex-end">
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
          Generate Tax Summary Report
        </Button>
      </VuiBox>
      {showPremiumAlert && (
        <Alert
          severity="info"
          sx={{
            mt: 2,
            backgroundColor: "rgba(187, 134, 252, 0.1)",
            color: "#bb86fc",
            border: "1px solid #bb86fc",
          }}
        >
          This feature is only available with a premium subscription. Upgrade now for advanced tax
          reporting.
        </Alert>
      )}
    </VuiBox>
  );
};

export default Transactions;
