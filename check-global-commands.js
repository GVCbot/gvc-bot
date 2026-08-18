require("dotenv").config();

const clientId = process.env.APPLICATION_ID;
const token = process.env.TOKEN;

const url = `https://discord.com/api/v10/applications/${clientId}/commands`;

fetch(url, {
  method: "GET",
  headers: { Authorization: `Bot ${token}` },
})
  .then(async (res) => {
    console.log("Status:", res.status);
    const data = await res.json();
    console.log("Command count:", Array.isArray(data) ? data.length : "N/A");
    if (Array.isArray(data)) console.log(data.map((c) => c.name).slice(0, 10));
  })
  .catch((err) => console.error("❌ fetch failed:", err));