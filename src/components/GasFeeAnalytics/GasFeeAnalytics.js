import React, { useState, useEffect } from "react";
import { 
  Grid, 
  Stack, 
  Card, 
  Typography, 
  Box,
  LinearProgress,
  CircularProgress,
  Alert
} from "@mui/material";
import { 
  IoWalletOutline,
  IoRocketOutline,
  IoConstructOutline,
  IoCartOutline 
} from "react-icons/io5";
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const ADDRESS = "0x7e2a2FA2a064F693f0a55C5639476d913Ff12D05"; // USDT contract
const API_KEY = "V8RHS7P2YNSAHUY92CXVANVQK8MIYK95UQ";

const GasFeeAnalytics = () => {
  const [allTransactions, setAllTransactions] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [gasMetrics, setGasMetrics] = useState({
    gasPriceTrends: [],
    totalGasSpent: 0,
    totalGasSpentUSD: 0,
    networkAverageComparison: 0,
    dailyGasSpent: [],
    networkAverageGasPrice: 30
  });
  const [ethPrice, setEthPrice] = useState(3000);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [timeframe, setTimeframe] = useState(30); // Days to analyze

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Fetch transactions with pagination
        const txResponse = await fetch(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${ADDRESS}&startblock=0&endblock=99999999&page=1&offset=10000&sort=desc&apikey=${API_KEY}`
        );
        const txData = await txResponse.json();
        
        if (txData.status !== "1") {
          throw new Error(txData.message || "No transactions found");
        }
        
        // Filter out failed transactions and validate data
        const successfulTxs = txData.result.filter(tx => 
          tx.isError === "0" && 
          tx.gasPrice && 
          (tx.gasUsed || tx.gas) &&
          tx.timeStamp
        );
        
        setAllTransactions(successfulTxs);
        
        // Fetch ETH price
        const ethPriceResponse = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        );
        const ethPriceData = await ethPriceResponse.json();
        setEthPrice(ethPriceData.ethereum?.usd || 3000);
        
        // Fetch current gas prices
        const gasPriceResponse = await fetch(
          `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${API_KEY}`
        );
        const gasPriceData = await gasPriceResponse.json();
        
        if (gasPriceData.status === "1") {
          const avgGas = parseFloat(gasPriceData.result.ProposeGasPrice) || 30;
          setGasMetrics(prev => ({
            ...prev,
            networkAverageGasPrice: avgGas > 0 ? avgGas : 30
          }));
        }
        
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  useEffect(() => {
    // Filter to selected timeframe
    const now = Date.now() / 1000;
    const daysAgo = now - (timeframe * 24 * 60 * 60);
    const recentTxs = allTransactions.filter(tx => tx.timeStamp >= daysAgo);
    setRecentTransactions(recentTxs);

    if (recentTxs.length > 0) {
      const processedData = processTransactionData(recentTxs);
      setGasMetrics(prev => ({
        ...prev,
        ...processedData
      }));
    } else {
      setGasMetrics(prev => ({
        ...prev,
        gasPriceTrends: [],
        totalGasSpent: 0,
        totalGasSpentUSD: 0,
        networkAverageComparison: 0,
        dailyGasSpent: []
      }));
    }
  }, [allTransactions, timeframe, gasMetrics.networkAverageGasPrice]);

  const processTransactionData = (txs) => {
    // Group by day
    const dailyData = {};
    txs.forEach(tx => {
      try {
        const date = new Date(parseInt(tx.timeStamp) * 1000).toLocaleDateString();
        if (!dailyData[date]) {
          dailyData[date] = { prices: [], amounts: [] };
        }
        
        const gasPrice = parseInt(tx.gasPrice) / 1e9; // Gwei
        const gasUsed = parseInt(tx.gasUsed || tx.gas);
        const gasCost = (gasUsed * parseInt(tx.gasPrice)) / 1e18; // ETH
        
        dailyData[date].prices.push(gasPrice);
        dailyData[date].amounts.push(gasCost);
      } catch (e) {
        console.warn("Failed to process transaction:", tx.hash, e);
      }
    });

    // Calculate metrics
    const gasPriceTrends = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        avgPrice: data.prices.reduce((a, b) => a + b, 0) / data.prices.length
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const dailyGasSpent = Object.entries(dailyData)
      .map(([date, data]) => ({
        date,
        value: data.amounts.reduce((a, b) => a + b, 0)
      }))
      .sort((a, b) => new Date(a.date) - new Date(b.date));

    const totalGasSpent = dailyGasSpent.reduce((sum, day) => sum + day.value, 0);
    const totalGasSpentUSD = totalGasSpent * ethPrice;

    // Calculate comparison
    let networkComparison = 0;
    if (gasPriceTrends.length > 0 && gasMetrics.networkAverageGasPrice > 0) {
      const userAvg = gasPriceTrends.reduce((sum, day) => sum + day.avgPrice, 0) / gasPriceTrends.length;
      networkComparison = ((userAvg - gasMetrics.networkAverageGasPrice) / gasMetrics.networkAverageGasPrice) * 100;
    }

    return {
      gasPriceTrends,
      totalGasSpent,
      totalGasSpentUSD,
      networkAverageComparison: networkComparison,
      dailyGasSpent
    };
  };

  // Chart data
  const lineChartData = gasMetrics.gasPriceTrends.map(item => ({
    date: item.date,
    'Your Gas Price (Gwei)': item.avgPrice,
    'Network Average (Gwei)': gasMetrics.networkAverageGasPrice
  }));

  const barChartData = gasMetrics.dailyGasSpent.map(item => ({
    date: item.date,
    'Daily Gas Spent (ETH)': item.value
  }));

  // Chart styling
  const chartTheme = {
    textColor: "#ffffff",
    axisColor: "#ffffff",
    gridColor: "rgba(255, 255, 255, 0.2)",
    tooltip: {
      backgroundColor: "#2D2E5F",
      borderColor: "#3A3B73",
      textColor: "#ffffff"
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <CircularProgress sx={{ color: "#ffffff" }} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 2, bgcolor: "rgba(255, 0, 0, 0.1)", color: "#ffffff" }}>
        Error: {error}
      </Alert>
    );
  }

  if (allTransactions.length === 0) {
    return (
      <Alert severity="info" sx={{ my: 2, bgcolor: "rgba(0, 0, 255, 0.1)", color: "#ffffff" }}>
        No transactions found for this address.
      </Alert>
    );
  }

  return (
    <Box sx={{ color: "#ffffff", p: 2 }}>
      <Grid container spacing={4} mb={3}>
              <Grid item xs={6} sm={4}>
                <MetricCard
                  icon={<IoWalletOutline size={20} />}
                  title="Total Gas"
                  value={`${gasMetrics.totalGasSpent.toFixed(6)} ETH`}
                  secondaryValue={`$${gasMetrics.totalGasSpentUSD.toFixed(2)}`}
                  progress={Math.min(100, gasMetrics.totalGasSpent * 100)}
                  disabled={recentTransactions.length === 0}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <MetricCard
                  icon={<IoRocketOutline size={20} />}
                  title="Avg Price"
                  value={`${
                    gasMetrics.gasPriceTrends.length > 0 ? 
                    (gasMetrics.gasPriceTrends.reduce((sum, day) => sum + day.avgPrice, 0) / 
                     gasMetrics.gasPriceTrends.length).toFixed(2) : '0.00'
                  } Gwei`}
                  progress={Math.min(100, 
                    gasMetrics.gasPriceTrends.length > 0 ?
                    (gasMetrics.gasPriceTrends.reduce((sum, day) => sum + day.avgPrice, 0) / 
                     (gasMetrics.gasPriceTrends.length * gasMetrics.networkAverageGasPrice)) * 100 : 0
                  )}
                  disabled={recentTransactions.length === 0}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <MetricCard
                  icon={<IoConstructOutline size={20} />}
                  title="Total Transactions"
                  value={recentTransactions.length.toLocaleString()}
                  progress={Math.min(100, recentTransactions.length / 100)}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <MetricCard
                  icon={<IoCartOutline size={20} />}
                  title="Network Avg"
                  value={`${gasMetrics.networkAverageGasPrice.toFixed(2)} Gwei`}
                  progress={100}
                />
              </Grid>
            </Grid>
      <Box mb={3} display="flex" alignItems="center">
        <Typography variant="h6" mr={2} fontWeight="bold" color="rgba(255,255,255,0.7)" fontSize={20}>
          Timeframe:
        </Typography>
        <select 
          value={timeframe}
          onChange={(e) => setTimeframe(Number(e.target.value))}
          style={{
            background: "rgba(16, 18, 37, 0.7)",
            color: "white",
            padding: "8px",
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.2)"
          }}
        >
          <option value={7}>Last 7 days</option>
          <option value={30}>Last 30 days</option>
          <option value={90}>Last 90 days</option>
          <option value={365}>Last year</option>
          <option value={1}>Today</option>
        </select>
      </Box>

      <Grid container spacing={3}>
        {/* Gas Price Trends */}
        <Grid item xs={12} lg={7}>
          <Card sx={{ 
            p: 3, 
            bgcolor: "rgba(16, 18, 37, 0.58)",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)"
          }}>
            <Typography variant="h5" fontWeight="bold" mb={2} color="rgba(142, 153, 188, 0.78)" fontSize="x-large" >
              Gas Price Trends ({timeframe === 0 ? 'All Time' : `Last ${timeframe} Days`})
            </Typography>
            
            <Box display="flex" alignItems="center" mb={3}>
              <Typography 
                variant="body1" 
                color={
                  isNaN(gasMetrics.networkAverageComparison) ? "#ffffff" :
                  gasMetrics.networkAverageComparison > 0 ? "#ff6b6b" : "#51cf66"
                } 
                fontWeight="bold"
              >
                {recentTransactions.length > 0 ? 
                  `${!isNaN(gasMetrics.networkAverageComparison) ? 
                    `${gasMetrics.networkAverageComparison > 0 ? '+' : ''}${gasMetrics.networkAverageComparison.toFixed(2)}%` : 
                    'N/A'}` : 
                  'No recent data'}{' '}
                <Typography component="span" color="rgba(255,255,255,0.7)">
                  vs network average ({gasMetrics.networkAverageGasPrice.toFixed(2)} Gwei)
                </Typography>
              </Typography>
            </Box>

            <Box sx={{ height: "350px" }}>
              {lineChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={lineChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      stroke={chartTheme.axisColor}
                    />
                    <YAxis 
                      tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      stroke={chartTheme.axisColor}
                    />
                    <Tooltip 
                      contentStyle={chartTheme.tooltip}
                      formatter={(value, name) => [`${value} ${name.includes('Gwei') ? 'Gwei' : 'ETH'}`, name]}
                    />
                    <Legend wrapperStyle={{ color: chartTheme.textColor }} />
                    <Line 
                      type="monotone" 
                      dataKey="Your Gas Price (Gwei)" 
                      stroke="#0075FF" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="Network Average (Gwei)" 
                      stroke="#2CD9FF" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="rgba(255,255,255,0.7)">
                    {recentTransactions.length === 0 ? 
                      `No transactions in the last ${timeframe} days` : 
                      'No gas price data available'}
                  </Typography>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Gas Consumption Summary */}
        <Grid item xs={12} lg={5}>
          <Card sx={{ 
            p: 3, 
            bgcolor: "rgba(16, 18, 37, 0.42)",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
            height: "100%"
          }}>
            <Typography variant="h5" fontWeight="bold" mb={2} color="rgba(142, 153, 188, 0.78)" fontSize="x-large" >
              Gas Consumption Summary
            </Typography>
            <Typography variant="body2" color="rgba(255,255,255,0.7)" mb={3}>
              {allTransactions.length.toLocaleString()} total transactions analyzed
              {recentTransactions.length > 0 && ` (${recentTransactions.length} in last ${timeframe} days)`}
            </Typography>
            
            <Box sx={{ height: "250px", mb: 3 }}>
              {barChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={chartTheme.gridColor} />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fill: chartTheme.textColor, fontSize: 10 }}
                      stroke={chartTheme.axisColor}
                    />
                    <YAxis 
                      tick={{ fill: chartTheme.textColor, fontSize: 12 }}
                      stroke={chartTheme.axisColor}
                    />
                    <Tooltip 
                      contentStyle={chartTheme.tooltip}
                      formatter={(value) => [`${value} ETH`, "Daily Gas Spent"]}
                    />
                    <Bar 
                      dataKey="Daily Gas Spent (ETH)" 
                      fill="#4BB543" 
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box display="flex" justifyContent="center" alignItems="center" height="100%">
                  <Typography color="rgba(255,255,255,0.7)">
                    {recentTransactions.length === 0 ? 
                      `No transactions in the last ${timeframe} days` : 
                      'No gas consumption data available'}
                  </Typography>
                </Box>
              )}
            </Box>

            
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

// Enhanced Metric Card Component
const MetricCard = ({ icon, title, value, secondaryValue, progress, disabled = false }) => (
  <Box sx={{ 
    bgcolor: disabled ? "rgba(45, 46, 95, 0.3)" : "rgba(45, 46, 95, 0.5)",
    borderRadius: "8px",
    p: 1.5,
    height: "100%",
    opacity: disabled ? 0.7 : 1
  }}>
    <Stack direction="row" alignItems="center" spacing={1} mb={1}>
      <Box sx={{ 
        bgcolor: disabled ? "rgba(0, 119, 255, 0.3)" : "primary.main",
        width: 28,
        height: 28,
        borderRadius: "6px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white"
      }}>
        {icon}
      </Box>
      <Typography variant="body2" color={disabled ? "rgba(255,255,255,0.5)" : "rgba(255,255,255,0.7)"}>
        {title}
      </Typography>
    </Stack>
    <Typography variant="h6" fontWeight="bold" mb={0.5} color={disabled ? "rgba(255,255,255,0.5)" : "#ffffff"}>
      {value}
    </Typography>
    {secondaryValue && (
      <Typography variant="body2" color={disabled ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.5)"} mb={1}>
        {secondaryValue}
      </Typography>
    )}
    <LinearProgress 
      variant="determinate" 
      value={progress} 
      sx={{ 
        height: 6, 
        borderRadius: 3,
        bgcolor: "rgba(255,255,255,0.1)",
        "& .MuiLinearProgress-bar": {
          bgcolor: disabled ? "rgba(0, 119, 255, 0.3)" : "#0075FF"
        }
      }} 
    />
  </Box>
);

export default GasFeeAnalytics;