/*!

=========================================================
* Vision UI Free React - v1.0.0
=========================================================

* Product Page: https://www.creative-tim.com/product/vision-ui-free-react
* Copyright 2021 Creative Tim (https://www.creative-tim.com/)
* Licensed under MIT (https://github.com/creativetimofficial/vision-ui-free-react/blob/master LICENSE.md)

* Design and Coded by Simmmple & Creative Tim

=========================================================

* The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

*/

import { useState } from "react";
import { Link } from "react-router-dom";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";
import VuiButton from "components/VuiButton";
import VuiSwitch from "components/VuiSwitch";
import GradientBorder from "examples/GradientBorder";

// Vision UI Dashboard assets
import radialGradient from "assets/theme/functions/radialGradient";
import palette from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import bgSignIn from "assets/images/blockchainbg.jpg";

// Icons for wallet providers
import { FaEthereum } from "react-icons/fa";
import { SiBinance } from "react-icons/si";
import { BsWallet2 } from "react-icons/bs";

function SignIn() {
  const [rememberMe, setRememberMe] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [isWalletConnected, setIsWalletConnected] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    wallet: ""
  });

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const handleEmailPasswordSignIn = (e) => {
    e.preventDefault();
    let valid = true;
    const newErrors = { email: "", password: "" };

    if (!email) {
      newErrors.email = "Email is required";
      valid = false;
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      valid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      valid = false;
    }

    setErrors(newErrors);

    if (valid) {
      // Proceed with email/password sign in
      console.log("Signing in with email:", email);
      // Add your authentication logic here
    }
  };

  const handleWalletSignIn = async () => {
    if (!window.ethereum) {
      setErrors({...errors, wallet: "Please install MetaMask or another Web3 wallet"});
      return;
    }

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
        setIsWalletConnected(true);
        setErrors({...errors, wallet: ""});
        
        // Proceed with wallet authentication
        console.log("Signing in with wallet:", accounts[0]);
        // Add your wallet authentication logic here
      }
    } catch (err) {
      setErrors({...errors, wallet: "Wallet connection failed"});
      console.error("Wallet connection failed:", err);
    }
  };

  const handleDisconnectWallet = () => {
    setWalletAddress("");
    setIsWalletConnected(false);
  };

  return (
    <CoverLayout
      title="Nice to see you!"
      color="white"
      description="Sign in with your credentials or Web3 wallet"
      premotto="INSPIRED BY THE FUTURE:"
      motto="SEE BEYOND THE CHAIN"
      image={bgSignIn}
    >
      <VuiBox
        display="flex"
        alignItems="center"
        justifyContent="center"
        mb={3}
        p={1.5}
        sx={({ palette }) => ({
          backgroundColor: palette.background.paper,
          borderRadius: "12px",
          width: "fit-content",
          mx: "auto",
        })}
      >
        <img
          src={require("assets/images/logo-CS.png")}
          alt="ChainSight AI Logo"
          style={{
            width: "120px",
            height: "auto",
          }}
        />
      </VuiBox>

      {/* Wallet Authentication Section */}
      <VuiBox mb={4} textAlign="center">
        <VuiTypography variant="h6" color="white" fontWeight="medium" mb={2}>
          Sign in with Wallet
        </VuiTypography>
        
        {isWalletConnected ? (
          <VuiBox>
            <VuiTypography variant="caption" color="success" mb={2}>
              Connected: {walletAddress.substring(0, 6)}...{walletAddress.substring(38)}
            </VuiTypography>
            <VuiButton 
              color="info" 
              fullWidth 
              onClick={handleDisconnectWallet}
              startIcon={<BsWallet2 size="16px" />}
            >
              Disconnect Wallet
            </VuiButton>
          </VuiBox>
        ) : (
          <VuiBox>
            <VuiButton 
              color="info" 
              fullWidth 
              onClick={handleWalletSignIn}
              startIcon={<FaEthereum size="16px" />}
            >
              Connect Ethereum Wallet
            </VuiButton>
            <VuiButton 
              color="info" 
              fullWidth 
              mt={2}
              onClick={handleWalletSignIn}
              startIcon={<SiBinance size="16px" />}
            >
              Connect BSC Wallet
            </VuiButton>
          </VuiBox>
        )}
        {errors.wallet && (
          <VuiTypography variant="caption" color="error" mt={1}>
            {errors.wallet}
          </VuiTypography>
        )}
      </VuiBox>

      <VuiTypography variant="body2" color="text" textAlign="center" mb={3}>
        ─── OR ───
      </VuiTypography>

      {/* Email/Password Authentication Section */}
      <VuiBox component="form" role="form" onSubmit={handleEmailPasswordSignIn}>
        <VuiBox mb={2}>
          <VuiBox mb={1} ml={0.5}>
            <VuiTypography required component="label" variant="button" color="white" fontWeight="medium">
              Email *
            </VuiTypography>
          </VuiBox>
          <GradientBorder
            minWidth="100%"
            padding="1px"
            borderRadius={borders.borderRadius.lg}
            backgroundImage={radialGradient(
              palette.gradients.borderLight.main,
              palette.gradients.borderLight.state,
              palette.gradients.borderLight.angle
            )}
          >
            <VuiInput 
              type="email" 
              placeholder="Your email..." 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              sx={({ typography: { size } }) => ({
                fontSize: size.sm,
              })}
              error={!!errors.email}
            />
          </GradientBorder>
          {errors.email && (
            <VuiTypography variant="caption" color="error" mt={1}>
              {errors.email}
            </VuiTypography>
          )}
        </VuiBox>

        <VuiBox mb={2}>
          <VuiBox mb={1} ml={0.5}>
            <VuiTypography required component="label" variant="button" color="white" fontWeight="medium">
              Password *
            </VuiTypography>
          </VuiBox>
          <GradientBorder
            minWidth="100%"
            borderRadius={borders.borderRadius.lg}
            padding="1px"
            backgroundImage={radialGradient(
              palette.gradients.borderLight.main,
              palette.gradients.borderLight.state,
              palette.gradients.borderLight.angle
            )}
          >
            <VuiInput
              type="password"
              placeholder="Your password..."
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={({ typography: { size } }) => ({
                fontSize: size.sm,
              })}
              error={!!errors.password}
            />
          </GradientBorder>
          {errors.password && (
            <VuiTypography variant="caption" color="error" mt={1}>
              {errors.password}
            </VuiTypography>
          )}
        </VuiBox>

        <VuiBox display="flex" alignItems="center" justifyContent="space-between">
          <VuiBox display="flex" alignItems="center">
            <VuiSwitch color="info" checked={rememberMe} onChange={handleSetRememberMe} />
            <VuiTypography
              variant="caption"
              color="white"
              fontWeight="medium"
              onClick={handleSetRememberMe}
              sx={{ cursor: "pointer", userSelect: "none" }}
            >
              &nbsp;&nbsp;&nbsp;&nbsp;Remember me
            </VuiTypography>
          </VuiBox>
          <VuiTypography
            component={Link}
            to="/authentication/forgot-password"
            variant="caption"
            color="white"
            fontWeight="medium"
          >
            Forgot password?
          </VuiTypography>
        </VuiBox>

        <VuiBox mt={4} mb={1}>
          <VuiButton type="submit" color="info" fullWidth>
            SIGN IN
          </VuiButton>
        </VuiBox>

        <VuiBox mt={3} textAlign="center">
          <VuiTypography variant="button" color="text" fontWeight="regular">
            Don&apos;t have an account?{" "}
            <VuiTypography
              component={Link}
              to="/authentication/sign-up"
              variant="button"
              color="white"
              fontWeight="medium"
            >
              Sign up
            </VuiTypography>
          </VuiTypography>
        </VuiBox>
      </VuiBox>
    </CoverLayout>
  );
}

export default SignIn;
