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

import { useEffect, useState } from "react";
import AppBar from "@mui/material/AppBar";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Tab from "@mui/material/Tab";
import Tabs from "@mui/material/Tabs";
import burceMars from "assets/images/avatar-simmmple.png";
import breakpoints from "assets/theme/base/breakpoints";
import VuiAvatar from "components/VuiAvatar";
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import { IoCube, IoDocument, IoBuild } from "react-icons/io5";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

function Header() {
  const [tabsOrientation, setTabsOrientation] = useState("horizontal");
  const [tabValue, setTabValue] = useState(0);

  // Load user data from .env
  const user = {
    name: process.env.REACT_APP_TEST_USERNAME || "Mark Johnson", // Fallback to hardcoded if .env fails
    email: process.env.REACT_APP_TEST_EMAIL || "mark@simmmple.com",
    avatar: burceMars,
  };

  useEffect(() => {
    function handleTabsOrientation() {
      setTabsOrientation(
        window.innerWidth < breakpoints.values.lg ? "vertical" : "horizontal"
      );
    }

    window.addEventListener("resize", handleTabsOrientation);
    handleTabsOrientation();
    return () => window.removeEventListener("resize", handleTabsOrientation);
  }, [tabsOrientation]);

  const handleSetTabValue = (event, newValue) => setTabValue(newValue);

  return (
    <VuiBox position="relative">
      <DashboardNavbar light />
      <Card sx={{ px: 3, mt: 2 }}>
        <Grid
          container
          alignItems="center"
          justifyContent="center"
          sx={({ breakpoints }) => ({
            [breakpoints.up("xs")]: { gap: "16px" },
            [breakpoints.up("sm")]: { gap: "0px" },
            [breakpoints.up("xl")]: { gap: "0px" },
          })}
        >
          {/* Avatar */}
          <Grid item xs={12} md={1.7} lg={1.5} xl={1.2} xxl={0.8} display="flex">
            <VuiAvatar
              src={user.avatar}
              alt="profile-image"
              variant="rounded"
              size="xl"
              shadow="sm"
            />
          </Grid>

          {/* User Info */}
          <Grid item xs={12} md={4.3} lg={4} xl={3.8} xxl={7}>
            <VuiBox height="100%" mt={0.5} lineHeight={1}>
              <VuiTypography variant="lg" color="white" fontWeight="bold">
                {user.name}
              </VuiTypography>
              <VuiTypography variant="button" color="text" fontWeight="regular">
                {user.email}
              </VuiTypography>
            </VuiBox>
          </Grid>

          {/* Tabs */}
          <Grid item xs={12} md={6} lg={6.5} xl={6} xxl={4} sx={{ ml: "auto" }}>
            <AppBar position="static">
              <Tabs
                orientation={tabsOrientation}
                value={tabValue}
                onChange={handleSetTabValue}
                sx={{ background: "transparent" }}
              >
                <Tab label="OVERVIEW" icon={<IoCube color="white" size="16px" />} />
                <Tab label="TEAMS" icon={<IoDocument color="white" size="16px" />} />
                <Tab label="PROJECTS" icon={<IoBuild color="white" size="16px" />} />
              </Tabs>
            </AppBar>
          </Grid>
        </Grid>
      </Card>
    </VuiBox>
  );
}

export default Header;

