import React, { useState, useEffect } from 'react';
import { Card, Stack, CircularProgress, Box, Grid } from '@mui/material';
import VuiBox from 'components/VuiBox';
import VuiTypography from 'components/VuiTypography';
import colors from 'assets/theme/base/colors';
import { FaEllipsisH } from 'react-icons/fa';
import linearGradient from 'assets/theme/functions/linearGradient';

const ADDRESS = "0x7e2a2FA2a064F693f0a55C5639476d913Ff12D05";
const API_KEY = "V8RHS7P2YNSAHUY92CXVANVQK8MIYK95UQ";

const GasMetricsDashboard = () => {
  const { info, gradients } = colors;
  const { cardContent } = gradients;
  
  const [data, setData] = useState({
    transactions: [],
    gasMetrics: {
      efficiencyScore: 0,
      optimizedTxs: 0,
      totalSavings: 0,
      avgGasPrice: 0,
      networkAvgPrice: 0,
      healthScore: 0
    },
    ethPrice: 0,
    timeframe: 7, // Default to 7 days
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true }));
        
        // 1. Fetch transactions from Etherscan
        const txResponse = await fetch(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`
        );
        const txData = await txResponse.json();
        
        if (txData.status !== "1") throw new Error(txData.message || "Failed to fetch transactions");
        
        // Filter valid transactions
        const validTxs = txData.result.filter(tx => 
          tx.isError === "0" && tx.gasPrice && (tx.gasUsed || tx.gas) && tx.timeStamp
        );
        
        // 2. Fetch current ETH price
        const ethPriceResponse = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        );
        const ethPriceData = await ethPriceResponse.json();
        const ethPrice = ethPriceData.ethereum?.usd || 0;
        
        // 3. Fetch current gas prices
        const gasPriceResponse = await fetch(
          `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${API_KEY}`
        );
        const gasPriceData = await gasPriceResponse.json();
        const networkAvgPrice = gasPriceData.status === "1" 
          ? parseFloat(gasPriceData.result.ProposeGasPrice) || 0 
          : 0;
        
        // Process data to calculate metrics
        const metrics = calculateGasMetrics(
          validTxs, 
          networkAvgPrice, 
          ethPrice, 
          data.timeframe
        );
        
        setData({
          transactions: validTxs,
          gasMetrics: metrics,
          ethPrice,
          timeframe: data.timeframe,
          loading: false,
          error: null
        });
        
      } catch (err) {
        setData(prev => ({
          ...prev,
          loading: false,
          error: err.message
        }));
      }
    };
    
    fetchData();
  }, [data.timeframe]);

  const calculateGasMetrics = (transactions, networkAvgPrice, ethPrice, timeframe) => {
    // Filter to selected timeframe
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - (timeframe * 24 * 60 * 60);
    const recentTxs = transactions.filter(tx => tx.timeStamp >= cutoff);
    
    if (recentTxs.length === 0) {
      return {
        efficiencyScore: 0,
        optimizedTxs: 0,
        totalSavings: 0,
        avgGasPrice: 0,
        networkAvgPrice,
        healthScore: 0
      };
    }
    
    // Calculate average gas price
    const totalGas = recentTxs.reduce((sum, tx) => {
      return sum + (parseInt(tx.gasPrice) / 1e9); // Convert to Gwei
    }, 0);
    const avgGasPrice = totalGas / recentTxs.length;
    
    // Calculate efficiency score (0-100%)
    const efficiencyScore = Math.min(100, Math.max(0,
      networkAvgPrice > 0 
        ? (1 - (avgGasPrice / networkAvgPrice)) * 100 
        : 0
    ));
    
    // Count optimized transactions (below network average)
    const optimizedTxs = recentTxs.filter(tx => 
      (parseInt(tx.gasPrice) / 1e9) < networkAvgPrice
    ).length;
    
    // Calculate total savings in USD
    const totalSavings = recentTxs.reduce((sum, tx) => {
      const gasUsed = parseInt(tx.gasUsed || tx.gas);
      const yourCost = (gasUsed * parseInt(tx.gasPrice)) / 1e18; // ETH
      const networkCost = (gasUsed * networkAvgPrice * 1e9) / 1e18; // ETH
      return sum + (networkCost - yourCost);
    }, 0) * ethPrice;
    
    // Calculate network health score (0-10)
    const healthScore = Math.min(10, 
      networkAvgPrice > 0 
        ? (1 - (networkAvgPrice / 100)) * 10 // Simple heuristic
        : 0
    );
    
    return {
      efficiencyScore,
      optimizedTxs,
      totalSavings,
      avgGasPrice,
      networkAvgPrice,
      healthScore
    };
  };

  const handleTimeframeChange = (days) => {
    setData(prev => ({ ...prev, timeframe: days, loading: true }));
  };

  if (data.error) {
    return (
      <Card sx={{
        height: '100%',
        background: linearGradient(gradients.cardDark.main, gradients.cardDark.state, gradients.cardDark.deg),
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3
      }}>
        <VuiTypography color="error" variant="h6">
          Error: {data.error}
        </VuiTypography>
      </Card>
    );
  }

  if (data.loading) {
    return (
      <Card sx={{
        height: '100%',
        background: linearGradient(gradients.cardDark.main, gradients.cardDark.state, gradients.cardDark.deg),
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        p: 3
      }}>
        <CircularProgress sx={{ color: "#ffffff" }} />
      </Card>
    );
  }

  return (
    <Card sx={{
      height: '100%',
      background: linearGradient(gradients.cardDark.main, gradients.cardDark.state, gradients.cardDark.deg)
    }}>
      <VuiBox sx={{ width: '100%', p: 3 }}>
        {/* Timeframe Selector */}
        <VuiBox display="flex" alignItems="center" mb={3}>
          <VuiTypography variant="button" color="text" mr={2}>
            Timeframe:
          </VuiTypography>
          {[7, 30, 90].map(days => (
            <Box
              key={days}
              onClick={() => handleTimeframeChange(days)}
              sx={{
                px: 2,
                py: 1,
                mr: 1,
                borderRadius: '8px',
                cursor: 'pointer',
                backgroundColor: data.timeframe === days ? '#0075FF' : '#22234B',
                color: data.timeframe === days ? 'white' : 'text.secondary',
                '&:hover': {
                  backgroundColor: data.timeframe === days ? '#0065D1' : '#2D2E5F'
                }
              }}
            >
              {days} days
            </Box>
          ))}
        </VuiBox>

        {/* Main Metrics Grid */}
        <Grid container spacing={3}>
          {/* Efficiency Score */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              p: 3,
              height: '100%',
              background: linearGradient(cardContent.main, cardContent.state, cardContent.deg),
              borderRadius: '20px'
            }}>
              <VuiTypography color="text" variant="button" mb={1}>
                Gas Efficiency
              </VuiTypography>
              <Box sx={{ position: 'relative', width: '100%', height: '150px' }}>
                <CircularProgress
                  variant="determinate"
                  value={data.gasMetrics.efficiencyScore}
                  size={120}
                  thickness={6}
                  color={
                    data.gasMetrics.efficiencyScore > 75 ? 'success' :
                    data.gasMetrics.efficiencyScore > 50 ? 'warning' : 'error'
                  }
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    filter: 'drop-shadow(0 0 8px rgba(0, 117, 255, 0.3))'
                  }}
                />
                <VuiTypography
                  variant="h2"
                  fontWeight="bold"
                  color="white"
                  sx={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: 'linear-gradient(135deg, #0075FF 0%, #2CD9FF 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}
                >
                  {data.gasMetrics.efficiencyScore.toFixed(0)}%
                </VuiTypography>
              </Box>
              <VuiTypography color="text" variant="caption" textAlign="center">
                Your transactions are {data.gasMetrics.efficiencyScore > 50 ? 'more' : 'less'} efficient than network average
              </VuiTypography>
            </Card>
          </Grid>

          {/* Savings & Optimized Transactions */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              p: 3,
              height: '100%',
              background: linearGradient(cardContent.main, cardContent.state, cardContent.deg),
              borderRadius: '20px'
            }}>
              <VuiTypography color="text" variant="button" mb={2}>
                Savings Overview
              </VuiTypography>
              
              <VuiBox mb={3}>
                <VuiTypography color="text" variant="caption">
                  Total Savings
                </VuiTypography>
                <VuiTypography variant="h3" fontWeight="bold" color="white">
                  ${data.gasMetrics.totalSavings.toFixed(2)}
                </VuiTypography>
                <VuiTypography color="text" variant="caption">
                  Compared to paying network average
                </VuiTypography>
              </VuiBox>
              
              <VuiBox>
                <VuiTypography color="text" variant="caption">
                  Optimized Transactions
                </VuiTypography>
                <VuiTypography variant="h4" fontWeight="bold" color="white">
                  {data.gasMetrics.optimizedTxs}/{data.transactions.length}
                </VuiTypography>
                <VuiTypography color="text" variant="caption">
                  ({Math.round((data.gasMetrics.optimizedTxs / data.transactions.length) * 100)}% of total)
                </VuiTypography>
              </VuiBox>
            </Card>
          </Grid>

          {/* Network Health */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              p: 3,
              height: '100%',
              background: linearGradient(cardContent.main, cardContent.state, cardContent.deg),
              borderRadius: '20px'
            }}>
              <VuiTypography color="text" variant="button" mb={2}>
                Network Health
              </VuiTypography>
              
              <VuiBox display="flex" alignItems="center" mb={3}>
                <Box sx={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: data.gasMetrics.healthScore > 7 ? '#51cf66' :
                                  data.gasMetrics.healthScore > 4 ? '#fcc419' : '#ff6b6b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mr: 2
                }}>
                  <VuiTypography variant="h4" color="white" fontWeight="bold">
                    {data.gasMetrics.healthScore.toFixed(1)}
                  </VuiTypography>
                </Box>
                <Box>
                  <VuiTypography variant="body2" color="text">
                    Current Network
                  </VuiTypography>
                  <VuiTypography variant="h5" color="white" fontWeight="bold">
                    {data.gasMetrics.networkAvgPrice.toFixed(2)} Gwei
                  </VuiTypography>
                </Box>
              </VuiBox>
              
              <VuiBox>
                <VuiTypography color="text" variant="caption">
                  Your Average
                </VuiTypography>
                <VuiTypography variant="h5" color="white" fontWeight="bold">
                  {data.gasMetrics.avgGasPrice.toFixed(2)} Gwei
                </VuiTypography>
                <VuiTypography color="text" variant="caption">
                  {data.gasMetrics.avgGasPrice < data.gasMetrics.networkAvgPrice ? 
                    'Below network average' : 'Above network average'}
                </VuiTypography>
              </VuiBox>
            </Card>
          </Grid>
        </Grid>

        {/* Transaction Summary */}
        <VuiBox mt={3}>
          <VuiTypography color="text" variant="caption">
            Analyzing {data.transactions.length} transactions from {ADDRESS.slice(0, 6)}...{ADDRESS.slice(-4)} over last {data.timeframe} days
          </VuiTypography>
        </VuiBox>
      </VuiBox>
    </Card>
  );
};

export default GasMetricsDashboard;