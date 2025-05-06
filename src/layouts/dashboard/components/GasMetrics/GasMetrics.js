import React, { useState, useEffect } from 'react';
import { Card, Box, Grid, CircularProgress } from '@mui/material';
import VuiBox from 'components/VuiBox';
import VuiTypography from 'components/VuiTypography';
import colors from 'assets/theme/base/colors';
import linearGradient from 'assets/theme/functions/linearGradient';

const ADDRESS = "0x7e2a2FA2a064F693f0a55C5639476d913Ff12D05";
const API_KEY = "V8RHS7P2YNSAHUY92CXVANVQK8MIYK95UQ";

const GasMetricsDashboard = () => {
  const { gradients } = colors;
  const { cardContent } = gradients;
  
  const [data, setData] = useState({
    transactions: [],
    metrics: {
      performanceScore: 0.0,
      totalSavings: 0,
      optimizedTxs: 0,
      totalTxs: 0,
      avgGasPrice: 0,
      networkAvgPrice: 0,
      healthScore: 0
    },
    timeframe: 90,
    loading: true,
    error: null
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        setData(prev => ({ ...prev, loading: true }));
        
        // Fetch transactions
        const txResponse = await fetch(
          `https://api.etherscan.io/api?module=account&action=txlist&address=${ADDRESS}&startblock=0&endblock=99999999&sort=desc&apikey=${API_KEY}`
        );
        const txData = await txResponse.json();
        
        if (txData.status !== "1") throw new Error(txData.message || "Failed to fetch transactions");
        
        const validTxs = txData.result.filter(tx => 
          tx.isError === "0" && tx.gasPrice && (tx.gasUsed || tx.gas) && tx.timeStamp
        );
        
        // Fetch ETH price
        const ethPriceResponse = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
        );
        const ethPriceData = await ethPriceResponse.json();
        const ethPrice = ethPriceData.ethereum?.usd || 0;
        
        // Fetch gas prices
        const gasPriceResponse = await fetch(
          `https://api.etherscan.io/api?module=gastracker&action=gasoracle&apikey=${API_KEY}`
        );
        const gasPriceData = await gasPriceResponse.json();
        const networkAvgPrice = gasPriceData.status === "1" 
          ? parseFloat(gasPriceData.result.ProposeGasPrice) || 0 
          : 0;
        
        // Calculate metrics
        const metrics = calculateMetrics(
          validTxs, 
          networkAvgPrice, 
          ethPrice, 
          data.timeframe
        );
        
        setData({
          transactions: validTxs,
          metrics,
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

  const calculateMetrics = (transactions, networkAvgPrice, ethPrice, timeframe) => {
    const now = Math.floor(Date.now() / 1000);
    const cutoff = now - (timeframe * 24 * 60 * 60);
    const recentTxs = transactions.filter(tx => tx.timeStamp >= cutoff);
    
    if (recentTxs.length === 0) {
      return {
        performanceScore: 0.0,
        totalSavings: 0,
        optimizedTxs: 0,
        totalTxs: 0,
        avgGasPrice: 0,
        networkAvgPrice,
        healthScore: 0
      };
    }
    
    // Calculate averages
    const totalGas = recentTxs.reduce((sum, tx) => sum + (parseInt(tx.gasPrice) / 1e9, 0));
    const avgGasPrice = totalGas / recentTxs.length;
    
    // Calculate performance score (0-10)
    const performanceScore = calculatePerformanceScore(recentTxs, avgGasPrice, networkAvgPrice);
    
    // Count optimized transactions
    const optimizedTxs = recentTxs.filter(tx => 
      (parseInt(tx.gasPrice) / 1e9) < networkAvgPrice
    ).length;
    
    // Calculate savings
    const totalSavings = recentTxs.reduce((sum, tx) => {
      const gasUsed = parseInt(tx.gasUsed || tx.gas);
      const yourCost = (gasUsed * parseInt(tx.gasPrice)) / 1e18;
      const networkCost = (gasUsed * networkAvgPrice * 1e9) / 1e18;
      return sum + (networkCost - yourCost);
    }, 0) * ethPrice;
    
    // Calculate health score
    const healthScore = calculateHealthScore(networkAvgPrice);
    
    return {
      performanceScore: performanceScore.toFixed(1),
      totalSavings,
      optimizedTxs,
      totalTxs: recentTxs.length,
      avgGasPrice: avgGasPrice.toFixed(2),
      networkAvgPrice: networkAvgPrice.toFixed(2),
      healthScore: healthScore.toFixed(1)
    };
  };

  const calculatePerformanceScore = (txs, avgPrice, networkAvg) => {
    if (networkAvg <= 0) return 0;
    
    // Base score (0-10) based on price difference
    let score = 10 - ((avgPrice / networkAvg) * 5);
    score = Math.max(0, Math.min(10, score));
    
    // Bonus for consistent low prices
    const lowPriceRatio = txs.filter(tx => 
      (parseInt(tx.gasPrice) / 1e9) < (networkAvg * 0.8)
    ).length / txs.length;
    
    return score + (lowPriceRatio * 2);
  };

  const calculateHealthScore = (networkAvg) => {
    return Math.min(10, (1 - (networkAvg / 100)) * 10);
  };

  const handleTimeframeChange = (days) => {
    setData(prev => ({ ...prev, timeframe: days, loading: true }));
  };

  const getPerformanceLabel = (score) => {
    if (score >= 8) return 'Excellent';
    if (score >= 6) return 'Good';
    if (score >= 4) return 'Fair';
    return 'Needs Improvement';
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
      background: linearGradient(gradients.cardDark.main, gradients.cardDark.state, gradients.cardDark.deg),
      borderRadius: '12px'
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
          {/* Gas Performance */}
          <Grid item xs={12} md={4}>
            <Card sx={{
              p: 3,
              height: '100%',
              background: linearGradient(cardContent.main, cardContent.state, cardContent.deg),
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <VuiTypography color="text" variant="button" mb={2}>
                Gas Performance
              </VuiTypography>
              
              <Box sx={{ 
                position: 'relative',
                width: 120,
                height: 120,
                mb: 2
              }}>
                <CircularProgress
                  variant="determinate"
                  value={data.metrics.performanceScore * 10}
                  size={120}
                  thickness={6}
                  color={
                    data.metrics.performanceScore >= 8 ? 'success' :
                    data.metrics.performanceScore >= 5 ? 'warning' : 'error'
                  }
                  sx={{
                    filter: 'drop-shadow(0 0 8px rgba(0, 117, 255, 0.3))'
                  }}
                />
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <VuiTypography 
                    variant="h3" 
                    fontWeight="bold"
                    sx={{
                      background: 'linear-gradient(135deg, #0075FF 0%, #2CD9FF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    {data.metrics.performanceScore}
                  </VuiTypography>
                </Box>
              </Box>

              <VuiTypography 
                color="white" 
                variant="h6" 
                fontWeight="bold"
                textAlign="center"
                mb={1}
              >
                {getPerformanceLabel(data.metrics.performanceScore)}
              </VuiTypography>
              
              <VuiTypography 
                color="text" 
                variant="caption" 
                textAlign="center"
              >
                {data.metrics.avgGasPrice} Gwei avg vs {data.metrics.networkAvgPrice} Gwei network
              </VuiTypography>
            </Card>
          </Grid>

          {/* Savings Overview */}
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
                  ${data.metrics.totalSavings.toFixed(2)}
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
                  {data.metrics.optimizedTxs}/{data.metrics.totalTxs}
                </VuiTypography>
                <VuiTypography color="text" variant="caption">
                  ({Math.round((data.metrics.optimizedTxs / data.metrics.totalTxs) * 100)}% of total)
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
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}>
              <VuiTypography color="text" variant="button" mb={2}>
                Network Health
              </VuiTypography>
              
              <Box sx={{ 
                position: 'relative',
                width: 120,
                height: 120,
                mb: 2
              }}>
                <CircularProgress
                  variant="determinate"
                  value={data.metrics.healthScore * 10}
                  size={120}
                  thickness={6}
                  color={
                    data.metrics.healthScore >= 8 ? 'success' :
                    data.metrics.healthScore >= 5 ? 'warning' : 'error'
                  }
                  sx={{
                    filter: 'drop-shadow(0 0 8px rgba(0, 117, 255, 0.3))'
                  }}
                />
                <Box sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <VuiTypography 
                    variant="h3" 
                    fontWeight="bold"
                    sx={{
                      background: 'linear-gradient(135deg, #0075FF 0%, #2CD9FF 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}
                  >
                    {data.metrics.healthScore}
                  </VuiTypography>
                </Box>
              </Box>

              <VuiTypography 
                color="text" 
                variant="caption" 
                textAlign="center"
                mb={1}
              >
                Current Network
              </VuiTypography>
              <VuiTypography 
                color="white" 
                variant="h6" 
                fontWeight="bold"
                textAlign="center"
              >
                {data.metrics.networkAvgPrice} Gwei
              </VuiTypography>
            </Card>
          </Grid>
        </Grid>

        {/* Transaction Summary */}
        <VuiBox mt={3}>
          <VuiTypography color="text" variant="caption">
            Analyzing {data.metrics.totalTxs} transactions from {ADDRESS.slice(0, 6)}...{ADDRESS.slice(-4)} over last {data.timeframe} days
          </VuiTypography>
        </VuiBox>
      </VuiBox>
    </Card>
  );
};

export default GasMetricsDashboard;