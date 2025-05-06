import React, { useState, useEffect } from "react";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiBadge from "components/VuiBadge";

// Vision UI Dashboard React examples
import Table from "examples/Tables/Table";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
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
    
    return (
      <VuiBadge 
        variant="contained" 
        color={status}
        badgeContent={statusText}
        container
      />
    );
  };

  return (
    <VuiBox>
      <VuiTypography variant="h6" color="white" fontWeight="medium" mb="12px">
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
          }))}
        />
      )}
    </VuiBox>
  );
};

export default Transactions;