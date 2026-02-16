import React from "react";
import { Box } from "@mui/material";
import ConversationItem from "./ConversationItem.jsx";

const ConversationFlow = ({ conversationItems, conversationEndRef }) => {
  return (
    <Box sx={{ display: "flex", justifyContent: "center" }}>
      <Box
        sx={{
          width: { xs: "95%", sm: "85%", md: "75%" },
          maxWidth: { xs: "none", md: "1000px" },
        }}
      >
        <Box sx={{ mb: 20 }}>
          {conversationItems.map((item, index) => (
            <ConversationItem
              key={index}
              item={item}
              index={index}
            />
          ))}
          <div ref={conversationEndRef} />
        </Box>
      </Box>
    </Box>
  );
};

export default ConversationFlow;