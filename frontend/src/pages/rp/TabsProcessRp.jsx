import { useState } from "react";
import { Box, Tabs, Tab, Typography } from "@mui/material";

export default function TabsProcessRp() {
  const [value, setValue] = useState(0);

  const tabs = [
    {
      label: "Pending Requester",
      content: "Content Pending Requester",
    },
    {
      label: "Destination Checker",
      content: "Content Destination Checker",
    },
    {
      label: "Destination Manager",
      content: "Content Destination Manager",
    },
    {
      label: "Approved",
      content: "Content Approved",
    },
    {
      label: "Rejected",
      content: "Content Rejected",
    },
    {
      label: "Voided",
      content: "Content Voided",
    },
  ];

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: "100%" }}>
      {/* Tabs */}
      <Tabs
        value={value}
        onChange={handleChange}
        variant="scrollable"
        scrollButtons="auto"
      >
        {tabs.map((tab, index) => (
          <Tab key={index} label={tab.label} />
        ))}
      </Tabs>

      {/* Content */}
      <Box
        sx={{
          mt: 2,
          p: 3,
          border: "1px solid",
          borderColor: "divider",
          borderRadius: 2,
          bgcolor: "background.paper",
        }}
      >
        <Typography variant="h6" gutterBottom>
          {tabs[value].label}
        </Typography>

        <Typography color="text.secondary">
          {tabs[value].content}
        </Typography>
      </Box>
    </Box>
  );
}

export default TabsProcessRp