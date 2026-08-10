const fs = require("fs");
const path = require("path");

const filePath = path.join(__dirname, "../data/sessionLinks.json");

// Ensure file exists
if (!fs.existsSync(filePath)) {
  fs.writeFileSync(filePath, JSON.stringify({}));
}

function loadLinks() {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function saveLinks(data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

module.exports = {
  saveSessionLink(id, link) {
    const data = loadLinks();
    data[id] = link;
    saveLinks(data);
  },

  getSessionLink(id) {
    const data = loadLinks();
    return data[id] || null;
  },
};
