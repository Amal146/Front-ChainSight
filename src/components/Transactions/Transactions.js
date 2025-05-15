import React, { useState, useEffect } from "react";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiBadge from "components/VuiBadge";
import { Modal, Button, Box, Divider, CircularProgress } from "@mui/material";
// Vision UI Dashboard React examples
import Table from "examples/Tables/Table";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [openModal, setOpenModal] = useState(false);
  const [selectedTx, setSelectedTx] = useState(null);
  const [explanation, setExplanation] = useState(null);
  const [explaining, setExplaining] = useState(false);
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
      <VuiTypography variant="h1" fontWeight="bold" color="white" mb={3} fontSize="x-large">
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
                width: "6px",
              },
              "&::-webkit-scrollbar-thumb": {
                backgroundColor: "#4fc3f7",
                borderRadius: "3px",
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
                }}
              >
                <CircularProgress sx={{ color: "#4fc3f7" }} />
              </Box>
            ) : explanation && explanation.interpretation ? (
              <Box
                sx={{
                  backgroundColor: "#252545",
                  padding: 3,
                  borderRadius: 2,
                  "& p": { marginBottom: 2 },
                  "& strong": { color: "#4fc3f7" },
                  "& em": { color: "#a5d6a7", fontStyle: "italic" },
                  "& ul": { paddingLeft: 3, marginBottom: 2 },
                  "& li": { marginBottom: 1 },
                }}
              >
                <VuiTypography variant="h6" sx={{ color: "#4fc3f7", mb: 2 }}>
                  {explanation.interpretation.summary}
                </VuiTypography>
                <Divider sx={{ bgcolor: "#4fc3f7", mb: 3 }} />
                <VuiTypography variant="body1" sx={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                  {explanation.interpretation.interpretation.split("\n\n").map((paragraph, i) => (
                    <React.Fragment key={i}>
                      {paragraph}
                      <br />
                      <br />
                    </React.Fragment>
                  ))}
                </VuiTypography>
              </Box>
            ) : (
              <VuiTypography sx={{ color: "#ef9a9a" }}>No interpretation available.</VuiTypography>
            )}
          </Box>
        </Box>
      </Modal>
    </VuiBox>
  );
};

export default Transactions;
