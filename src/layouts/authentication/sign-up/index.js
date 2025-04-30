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

// react-router-dom components
import { Link } from "react-router-dom";

// @mui material components
import Icon from "@mui/material/Icon";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";

// Icons
import { FaEthereum } from "react-icons/fa";
import { SiHedera, SiBinance } from "react-icons/si";
import { FiPlus } from "react-icons/fi";

// Vision UI Dashboard React components
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import VuiInput from "components/VuiInput";
import VuiButton from "components/VuiButton";
import VuiSwitch from "components/VuiSwitch";
import GradientBorder from "examples/GradientBorder";

// Vision UI Dashboard assets
import radialGradient from "assets/theme/functions/radialGradient";
import rgba from "assets/theme/functions/rgba";
import palette from "assets/theme/base/colors";
import borders from "assets/theme/base/borders";

// Authentication layout components
import CoverLayout from "layouts/authentication/components/CoverLayout";

// Images
import bgSignIn from "assets/images/blockchainbg.jpg";

function SignIn() {
  const [rememberMe, setRememberMe] = useState(true);
  const [selectedBlockchain, setSelectedBlockchain] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherBlockchain, setOtherBlockchain] = useState("");

  const handleSetRememberMe = () => setRememberMe(!rememberMe);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation checks
    if (!username) {
      alert("Please enter a username.");
      return;
    }
    if (!email) {
      alert("Please enter an email.");
      return;
    }
    if (!password) {
      alert("Please enter a password.");
      return;
    }
    if (password !== confirmPassword) {
      alert("Passwords don't match!");
      return;
    }
    if (!walletAddress) {
      alert("Please connect your wallet.");
      return;
    }
    if (!selectedBlockchain) {
      alert("Please select a blockchain type.");
      return;
    }
    if (selectedBlockchain === "other" && !otherBlockchain) {
      alert("Please specify the blockchain name.");
      return;
    }

    // Form submission logic here
    const blockchainType = selectedBlockchain === "other" ? otherBlockchain : selectedBlockchain;
    console.log("Form submitted successfully", {
      username,
      email,
      password,
      walletAddress,
      blockchainType
    });
  };

  return (
    <CoverLayout
      title="Welcome!"
      color="white"
      image={bgSignIn}
      premotto="INSPIRED BY THE FUTURE:"
      motto="SEE BEYOND THE CHAIN"
      cardContent
    >
      <GradientBorder borderRadius={borders.borderRadius.form} minWidth="100%" maxWidth="100%">
        <VuiBox
          component="form"
          role="form"
          borderRadius="inherit"
          p="45px"
          sx={({ palette: { secondary } }) => ({
            backgroundColor: secondary.focus,
          })}
          onSubmit={handleSubmit}
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

          <VuiTypography
            color="white"
            fontWeight="bold"
            textAlign="center"
            mb="24px"
            sx={({ typography: { size } }) => ({
              fontSize: size.lg,
            })}
          >
            Register Your Wallet
          </VuiTypography>
          
          {/* Username */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography
                required
                component="label"
                variant="button"
                color="white"
                fontWeight="medium"
              >
                Username *
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
                placeholder="Your username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
                required
              />
            </GradientBorder>
          </VuiBox>
          
          {/* Email */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Email *
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
                type="email"
                placeholder="Your email..."
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
                required
              />
            </GradientBorder>
          </VuiBox>

          {/* Password */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
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
                required
              />
            </GradientBorder>
          </VuiBox>

          {/* Confirm Password */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Confirm Password *
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
                placeholder="Confirm your password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                })}
                required
              />
            </GradientBorder>
          </VuiBox>

          {/* Wallet Address */}
          <VuiBox mb={2}>
            <VuiBox
              mb={1}
              ml={0.5}
              display="flex"
              alignItems="center"
              justifyContent="space-between"
            >
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Wallet Address *
              </VuiTypography>
              <VuiButton
                color="info"
                size="small"
                onClick={async () => {
                  if (!window.ethereum) {
                    alert("Please install MetaMask!");
                    return;
                  }
                  try {
                    const accounts = await window.ethereum.request({
                      method: "eth_requestAccounts",
                    });
                    setWalletAddress(accounts[0]);
                  } catch (err) {
                    console.error("Wallet connection failed", err);
                  }
                }}
              >
                Connect Wallet
              </VuiButton>
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
                value={walletAddress}
                placeholder="Connect to get your address..."
                readOnly
                sx={({ typography: { size } }) => ({
                  fontSize: size.sm,
                  color: "white",
                })}
                required
              />
            </GradientBorder>
          </VuiBox>

          {/* Blockchain Type */}
          <VuiBox mb={2}>
            <VuiBox mb={1} ml={0.5}>
              <VuiTypography component="label" variant="button" color="white" fontWeight="medium">
                Select Blockchain *
              </VuiTypography>
            </VuiBox>
            <VuiBox display="flex" justifyContent="space-between" mt={2} flexWrap="wrap">
              {/* Ethereum */}
              <IconButton
                onClick={() => {
                  setSelectedBlockchain("ethereum");
                  setShowOtherInput(false);
                }}
                sx={{
                  border:
                    selectedBlockchain === "ethereum"
                      ? "2px solid #00e0ff"
                      : "2px solid transparent",
                  borderRadius: "12px",
                  padding: "10px",
                  backgroundColor: "transparent",
                  transition: "all 0.3s ease",
                  marginBottom: "10px",
                }}
              >
                <FaEthereum size={30} color="white" />
              </IconButton>

              {/* Hedera */}
              <IconButton
                onClick={() => {
                  setSelectedBlockchain("hedera");
                  setShowOtherInput(false);
                }}
                sx={{
                  border:
                    selectedBlockchain === "hedera" ? "2px solid #00e0ff" : "2px solid transparent",
                  borderRadius: "12px",
                  padding: "10px",
                  backgroundColor: "transparent",
                  transition: "all 0.3s ease",
                  marginBottom: "10px",
                }}
              >
                <SiHedera size={30} color="white" />
              </IconButton>

              {/* Binance Smart Chain */}
              <IconButton
                onClick={() => {
                  setSelectedBlockchain("binance");
                  setShowOtherInput(false);
                }}
                sx={{
                  border:
                    selectedBlockchain === "binance"
                      ? "2px solid #00e0ff"
                      : "2px solid transparent",
                  borderRadius: "12px",
                  padding: "10px",
                  backgroundColor: "transparent",
                  transition: "all 0.3s ease",
                  marginBottom: "10px",
                }}
              >
                <SiBinance size={30} color="white" />
              </IconButton>

              {/* Other Blockchain */}
              <IconButton
                onClick={() => {
                  setSelectedBlockchain("other");
                  setShowOtherInput(true);
                }}
                sx={{
                  border:
                    selectedBlockchain === "other" ? "2px solid #00e0ff" : "2px solid transparent",
                  borderRadius: "12px",
                  padding: "10px",
                  backgroundColor: "transparent",
                  transition: "all 0.3s ease",
                  marginBottom: "10px",
                }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <FiPlus size={20} color="white" />
                  <VuiTypography variant="button" color="white">
                    Other
                  </VuiTypography>
                </Stack>
              </IconButton>
            </VuiBox>

            {/* Other Blockchain Input */}
            {showOtherInput && (
              <VuiBox mt={2}>
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
                    placeholder="Specify blockchain name..."
                    value={otherBlockchain}
                    onChange={(e) => setOtherBlockchain(e.target.value)}
                    sx={({ typography: { size } }) => ({
                      fontSize: size.sm,
                    })}
                  />
                </GradientBorder>
              </VuiBox>
            )}
          </VuiBox>

          {/* Remember Me */}
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

          {/* Sign Up Button */}
          <VuiButton
            type="submit"
            color="info"
            fullWidth
          >
            SIGN UP
          </VuiButton>

          {/* Already have an account */}
          <VuiBox mt={3} textAlign="center">
            <VuiTypography variant="button" color="text" fontWeight="regular">
              Already have an account?{" "}
              <VuiTypography
                component={Link}
                to="/authentication/sign-in"
                variant="button"
                color="white"
                fontWeight="medium"
              >
                Sign in
              </VuiTypography>
            </VuiTypography>
          </VuiBox>
        </VuiBox>
      </GradientBorder>
    </CoverLayout>
  );
}

export default SignIn;