// import React from "react";
// import ReactDOM from "react-dom";  // แก้จาก react-dom/client เป็น react-dom
// import App from "./App";
// import { BrowserRouter } from "react-router-dom";
// import "./index.css";

// ReactDOM.render(
//   <React.StrictMode>
//     <BrowserRouter>
//       <App />
//     </BrowserRouter>
//   </React.StrictMode>,
//   document.getElementById("root")
// );

import { jsxDEV } from "@emotion/react/jsx-dev-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import "./index.css";

// Find the root DOM node
const container = document.getElementById("root");

// Create a root container using the new API
const root = createRoot(container);

// Render your app into the root container
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
