import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Card,
  Icon,
  TextField,
  Button,
  CircularProgress,
  Fab,
} from "@mui/material";
import VuiBox from "components/VuiBox";
import VuiTypography from "components/VuiTypography";
import gif from "assets/images/welcome-profile.png";

const WelcomeMark = () => {
  const [message, setMessage] = useState("");
  const [replyList, setReplyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  // Load from sessionStorage
  useEffect(() => {
    const savedReplies = sessionStorage.getItem("chatReplies");
    if (savedReplies) {
      setReplyList(JSON.parse(savedReplies));
    }
  }, []);

  // Save to sessionStorage on every update
  useEffect(() => {
    sessionStorage.setItem("chatReplies", JSON.stringify(replyList));
  }, [replyList]);

  const sendMessage = async () => {
    if (!message.trim()) return;
    const userMsg = { from: "user", text: message };
    setReplyList((prev) => [...prev, userMsg]);
    setLoading(true);
    setMessage("");

    try {
      const res = await axios.post(
        "https://chainsightbot.onrender.com/api/chatbot/chat",
        { message }
      );
      const aiReply = { from: "bot", text: res.data.reply };
      setReplyList((prev) => [...prev, aiReply]);
    } catch (error) {
      const errorReply = {
        from: "bot",
        text: "Something went wrong. Please try again later.",
      };
      setReplyList((prev) => [...prev, errorReply]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* === Welcome Card at the Top === */}
      <Card
        sx={{
          height: "520px",
          py: "32px",
          px: "24px",
          backgroundImage: `url(${gif})`,
          backgroundSize: "cover",
          backgroundPosition: "50%",
          color: "#fff",
        }}
      >
        <VuiBox height="100%" display="flex" flexDirection="column" justifyContent="space-between">
          <VuiBox>
            <VuiTypography color="white" variant="button" fontWeight="regular" mb="12px">
              Welcome,
            </VuiTypography>
            <VuiTypography color="white" variant="h3" fontWeight="bold" mb="18px">
              Dear User
            </VuiTypography>
            <VuiTypography color="white" variant="h6" fontWeight="regular" mb="auto">
              Glad to see you! <br /> Ask me anything.
            </VuiTypography>
          </VuiBox>

          <VuiTypography
            component="a"
            onClick={() => setChatOpen(true)}
            variant="button"
            color="white"
            fontWeight="regular"
            sx={{
              mr: "5px",
              display: "inline-flex",
              alignItems: "center",
              cursor: "pointer",
              "& .material-icons-round": {
                fontSize: "1.125rem",
                transform: "translate(2px, -0.5px)",
                transition: "transform 0.2s cubic-bezier(0.34,1.61,0.7,1.3)",
              },
              "&:hover .material-icons-round": {
                transform: "translate(6px, -0.5px)",
              },
            }}
          >
            Go to the Chatbot
            <Icon sx={{ fontWeight: "bold", ml: "5px" }}>arrow_forward</Icon>
          </VuiTypography>
        </VuiBox>
      </Card>

      {/* === Chatbot Messenger Floating Box === */}
      {chatOpen && (
        <Card
          sx={{
            position: "fixed",
            bottom: 80,
            right: 20,
            width: 350,
            maxHeight: 500,
            display: "flex",
            flexDirection: "column",
            borderRadius: "16px",
            overflow: "hidden",
            zIndex: 2000,
            boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
          }}
        >
          <VuiBox
            sx={{
              backgroundColor: "#1976d2",
              color: "white",
              px: 2,
              py: 1,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <VuiTypography variant="subtitle1" fontWeight="bold">
              💬 ChainSightbot Chat
            </VuiTypography>
            <Icon
              onClick={() => setChatOpen(false)}
              sx={{ cursor: "pointer", fontSize: "20px" }}
            >
              close
            </Icon>
          </VuiBox>

          <VuiBox
            sx={{
              flex: 1,
              p: 2,
              fontSize: "0.85rem",
              backgroundColor: "#f9f9f9",
              overflowY: "auto",
            }}
          >
            {replyList.map((msg, index) => (
              <VuiBox
                key={index}
                sx={{
                  mb: 1,
                  fontSize: "0.85rem",
                  display: "flex",
                  justifyContent: msg.from === "user" ? "flex-end" : "flex-start",
                }}
              >
                <VuiBox
                  sx={{
                    px: 2,
                    fontSize: "0.85rem",
                    py: 1,
                    borderRadius: 2,
                    backgroundColor: msg.from === "user" ? "#1976d2" : "#e0e0e0",
                    color: msg.from === "user" ? "white" : "black",
                    maxWidth: "80%",
                  }}
                >
                  {msg.text}
                </VuiBox>
              </VuiBox>
            ))}
          </VuiBox>

          <VuiBox sx={{ display: "flex", p: 1, gap: 1, backgroundColor: "#fff" }}>
            <TextField
              variant="outlined"
              placeholder="Type a message..."
              size="small"
              fullWidth
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
            />
            <Button
              variant="contained"
              onClick={sendMessage}
              disabled={loading}
            >
              {loading ? <CircularProgress size={20} color="inherit" /> : "Send"}
            </Button>
          </VuiBox>
        </Card>
      )}

      {/* === Permanent Chat Button === */}
      <Fab
        color="primary"
        onClick={() => setChatOpen((prev) => !prev)}
        sx={{
          position: "fixed",
          bottom: 100,
          right: 20,
          zIndex: 1999,
          backgroundColor: "#1976d2",
          "&:hover": {
            backgroundColor: "#155a9c",
          },
        }}
      >
        <Icon>chat</Icon>
      </Fab>
    </>
  );
};

export default WelcomeMark;
