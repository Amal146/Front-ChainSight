import React, { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
  CircularProgress,
  Pagination,
} from "@mui/material";

const Transactions = () => {
  const [transactions, setTransactions] = useState([]); // Initialize as [] instead of undefined
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null); // New error state
  const [page, setPage] = useState(1);
  const rowsPerPage = 10;

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const response = await fetch(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${process.env.REACT_APP_TEST_WALLET}&startblock=0&endblock=99999999&sort=desc&apikey=${process.env.REACT_APP_TEST_API_KEY}`
        );
        const data = await response.json();
        if (data.status === "1") {
          setTransactions(data.result || []); // Ensure data.result is never undefined
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

  // Pagination logic (now safe since transactions is always an array)
  const paginatedTransactions = transactions.slice((page - 1) * rowsPerPage, page * rowsPerPage);

  return (
    <TableContainer component={Paper} sx={{ marginTop: 4 }}>
      <Typography variant="h6" sx={{ padding: 2 }}>
        Recent Transactions
      </Typography>

      {loading ? (
        <CircularProgress sx={{ display: "block", margin: "20px auto" }} />
      ) : error ? (
        <Typography color="error" sx={{ padding: 2 }}>
          Error: {error}
        </Typography>
      ) : transactions.length === 0 ? (
        <Typography sx={{ padding: 2 }}>No transactions found.</Typography>
      ) : (
        <>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Tx Hash</strong>
                </TableCell>
                <TableCell>
                  <strong>From</strong>
                </TableCell>
                <TableCell>
                  <strong>To</strong>
                </TableCell>
                <TableCell>
                  <strong>Value (ETH)</strong>
                </TableCell>
                <TableCell>
                  <strong>Timestamp</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginatedTransactions.map((tx) => (
                <TableRow key={tx.hash}>
                  <TableCell sx={{ fontFamily: "monospace" }}>
                    {tx.hash.substring(0, 12)}...
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>
                    {tx.from.substring(0, 10)}...
                  </TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>
                    {tx.to.substring(0, 10)}...
                  </TableCell>
                  <TableCell>{(parseInt(tx.value) / 1e18).toFixed(4)}</TableCell>
                  <TableCell>{new Date(tx.timeStamp * 1000).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {transactions.length > rowsPerPage && (
            <Pagination
              count={Math.ceil(transactions.length / rowsPerPage)}
              page={page}
              onChange={(_, newPage) => setPage(newPage)}
              sx={{ padding: 2, display: "flex", justifyContent: "center" }}
            />
          )}
        </>
      )}
    </TableContainer>
  );
};

export default Transactions;
