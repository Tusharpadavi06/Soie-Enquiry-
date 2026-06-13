import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import fs from "fs";

// Simple stateful in-memory database to persist across operations
interface EnquiryItem {
  styleNo: string;
  color: string;
  quantity: number;
  size: string;
}

interface Attachment {
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
}

interface SupplierResponse {
  composition: string;
  moq: number;
  mcq: number;
  price: number;
  deliveryTime: string;
  remark: string;
  respondedAt: string;
}

interface Enquiry {
  id: string;
  date: string;
  email: string;
  type: "New" | "Old" | "Repeat" | "New Launch";
  supplierName: string;
  customerName: string;
  styleNumber: string;
  description: string;
  items: EnquiryItem[];
  attachments: Attachment[];
  remark: string;
  routingTab: string;
  supplierResponseLink: string;
  status: "Pending" | "Responded";
  supplierResponse?: SupplierResponse;
  createdAt: string;
}

interface EmailLog {
  id: string;
  subject: string;
  to: string;
  cc: string;
  replyTo: string;
  body: string;
  date: string;
  headers: Record<string, string>;
}


// In-Memory Database
let enquiries: Enquiry[] = [
  {
    id: "enq_1",
    date: "2026-06-10",
    email: "merch1.soie@ginzalimited.com",
    type: "New",
    supplierName: "Vimal Fabrics Ltd",
    customerName: "SOIE",
    styleNumber: "C-920",
    description: "Lace Back Bikini Brief with soft elastic waistband",
    items: [
      { styleNo: "C-920-A", color: "Blush Pink", quantity: 1500, size: "Medium" },
      { styleNo: "C-920-B", color: "Crimson Red", quantity: 1200, size: "Large" },
      { styleNo: "C-920-C", color: "Midnight Black", quantity: 1800, size: "Small" }
    ],
    attachments: [
      { name: "lace_design_back.png", url: "https://drive.google.com/drive/folders/ginza-enquiries/lace_design_back.png", size: "1.4 MB", uploadedAt: "2026-06-10 14:22" },
      { name: "elastic_specs.pdf", url: "https://drive.google.com/drive/folders/ginza-enquiries/elastic_specs.pdf", size: "380 KB", uploadedAt: "2026-06-10 14:25" }
    ],
    remark: "Required with supreme soft lace. Standard fit.",
    routingTab: "Order Enquiries",
    supplierResponseLink: "https://drive.google.com/drive/folders/ginza-enquiries/enq_1",
    status: "Pending",
    createdAt: "2026-06-10T14:20:00Z"
  },
  {
    id: "enq_2",
    date: "2026-06-08",
    email: "merch2.soie@ginzalimited.com",
    type: "Repeat",
    supplierName: "Reliance Synthetics",
    customerName: "SOIE",
    styleNumber: "R-440",
    description: "Classic Microfiber Daily Bra",
    items: [
      { styleNo: "R-440-Rep", color: "Nude Skin", quantity: 5000, size: "34B" },
      { styleNo: "R-440-Rep", color: "White Rose", quantity: 3500, size: "36C" }
    ],
    attachments: [
      { name: "approved_shade_card.png", url: "https://drive.google.com/drive/folders/ginza-enquiries/approved_shade_card.png", size: "2.1 MB", uploadedAt: "2026-06-08 10:11" }
    ],
    remark: "R-440 repeat fabric order. Match dye lots perfectly.",
    routingTab: "SGU Order",
    supplierResponseLink: "https://ais-dev-3awwbubxiulcatxyljcrup-122034556387.asia-southeast1.run.app/?portal=supplier&id=enq_2",
    status: "Responded",
    createdAt: "2026-06-08T10:10:00Z",
    supplierResponse: {
      composition: "88% Nylon, 12% Spandex",
      moq: 1000,
      mcq: 500,
      price: 185.50,
      deliveryTime: "2026-07-25",
      remark: "Price held firm. Dye matching confirmed against shade card.",
      respondedAt: "2026-06-09T09:30:00Z"
    }
  },
  {
    id: "enq_3",
    date: "2026-06-09",
    email: "export.team@ginzalimited.com",
    type: "New Launch",
    supplierName: "Yarn & Thread Imp",
    customerName: "Nordstrom Int",
    styleNumber: "EXPORT-50",
    description: "Cotton Lurex Loungewear Shorts",
    items: [
      { styleNo: "EX-50-A", color: "Silver Gray", quantity: 3000, size: "S/M" },
      { styleNo: "EX-50-B", color: "Gold Beige", quantity: 3000, size: "L/XL" }
    ],
    attachments: [],
    remark: "Urgent shipment for Winter launch.",
    routingTab: "Export Enquiry",
    supplierResponseLink: "https://ais-dev-3awwbubxiulcatxyljcrup-122034556387.asia-southeast1.run.app/?portal=supplier&id=enq_3",
    status: "Pending",
    createdAt: "2026-06-09T18:15:00Z"
  }
];

let emails: EmailLog[] = [];

// Helper to routing logic - Now consolidated to a single tab as per user request
function determineRoutingTab(email: string, type: string): string {
  return "Order Enquiries";
}

// Function to generate professional HTML email markup
function generateEnquiryEmailHTML(enquiry: Enquiry) {
  // Solve undefined error by safely consolidating multiple items fields if present
  const colorsText = enquiry.items.map(item => item.color).filter(Boolean).join(", ") || "N/A";
  const quantitiesText = enquiry.items.map(item => item.quantity).filter(Boolean).join(", ") || "N/A";
  const sizesText = enquiry.items.map(item => item.size).filter(Boolean).join(", ") || "N/A";

  const attachmentsHTML = enquiry.attachments.length > 0 
    ? enquiry.attachments.map(att => `<a href="${att.url}" style="color: #2563eb; text-decoration: underline; margin-right: 15px;">🔗 ${att.name}</a>`).join(" ")
    : "None";

  // Build rows for items table
  const itemsTableRows = enquiry.items.map((item, index) => `
    <tr style="border-bottom: 1px solid #e2e8f0; font-family: sans-serif; font-size: 14px;">
      <td style="padding: 12px 10px; color: #1e293b; font-weight: bold;">${index + 1}</td>
      <td style="padding: 12px 10px; color: #334155;">${item.styleNo || enquiry.styleNumber}</td>
      <td style="padding: 12px 10px; color: #334155;">${item.color}</td>
      <td style="padding: 12px 10px; color: #334155;">${item.size}</td>
      <td style="padding: 12px 10px; color: #334155; text-align: right; font-weight: 600;">${item.quantity.toLocaleString()}</td>
    </tr>
  `).join("");

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f1f5f9; color: #334155; margin: 0; padding: 40px 20px; line-height: 1.6; }
    .container { max-width: 700px; margin: 0 auto; background: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1); }
    .header { background-color: #1e293b; padding: 32px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 24px; font-weight: 800; letter-spacing: 0.1em; color: #ffffff; margin-bottom: 4px; }
    .header-title { font-size: 14px; text-transform: uppercase; letter-spacing: 0.2em; color: #94a3b8; }
    .content { padding: 40px; }
    .intro { font-size: 16px; margin-bottom: 32px; color: #1e293b; }
    .ref-badge { display: inline-block; padding: 6px 14px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; font-weight: 700; color: #475569; font-size: 14px; margin-bottom: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px; }
    .field-card { background-color: #f8fafc; padding: 16px; border-radius: 8px; border: 1px solid #f1f5f9; }
    .label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #94a3b8; margin-bottom: 8px; letter-spacing: 0.05em; }
    .value { font-size: 14px; color: #1e293b; font-weight: 600; }
    .table-container { margin: 32px 0; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; }
    .items-table { width: 100%; border-collapse: collapse; text-align: left; }
    .items-table th { background-color: #f8fafc; padding: 14px 10px; font-size: 11px; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; letter-spacing: 0.05em; }
    .action-box { margin-top: 40px; text-align: center; background: #fdf4ff; border: 1px solid #f5d0fe; border-radius: 12px; padding: 32px; }
    .action-text { margin-bottom: 20px; color: #701a75; font-weight: 500; font-size: 15px; }
    .btn { display: inline-block; background-color: #7c3aed; color: #ffffff !important; font-weight: 700; text-decoration: none; padding: 14px 32px; border-radius: 8px; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(124, 58, 237, 0.3); }
    .footer { padding: 32px; background: #f8fafc; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 13px; }
    .details-row { border-top: 1px solid #f1f5f9; padding-top: 24px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">GINZA LIMITED</div>
      <div class="header-title">Official Order Enquiry</div>
    </div>
    
    <div class="content">
      <div class="intro">
        Dear Team,<br/><br/>
        Please click on the link below to submit pricing and quotation updates for <strong>Style Reference ${enquiry.styleNumber}</strong> (Ref ID: ${enquiry.id}):
      </div>

      <div class="action-box">
        <div class="action-text">Click here to open the secure supplier portal:</div>
        <a href="${enquiry.supplierResponseLink}" class="btn">Submit Quotation Updates</a>
      </div>

      <div class="details-row">
        <div class="ref-badge">ENQUIRY SPECIFICATIONS</div>
        
        <div class="grid">
          <div class="field-card">
            <div class="label">Date of Enquiry</div>
            <div class="value">${enquiry.date}</div>
          </div>
          <div class="field-card">
            <div class="label">Enquiry Type</div>
            <div class="value">${enquiry.type}</div>
          </div>
          <div class="field-card">
            <div class="label">Supplier</div>
            <div class="value">${enquiry.supplierName}</div>
          </div>
          <div class="field-card">
            <div class="label">Customer</div>
            <div class="value">${enquiry.customerName}</div>
          </div>
          <div class="field-card" style="grid-column: span 2;">
            <div class="label">Description</div>
            <div class="value">${enquiry.description || "N/A"}</div>
          </div>
        </div>

        <div class="table-container">
          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 40px;">#</th>
                <th>Style No</th>
                <th>Color</th>
                <th>Size</th>
                <th style="text-align: right;">Quantity</th>
              </tr>
            </thead>
            <tbody>
              ${itemsTableRows}
            </tbody>
          </table>
        </div>

        ${enquiry.remark ? `
        <div class="field-card" style="margin-bottom: 20px; background-color: #fffbeb; border-color: #fef3c7;">
          <div class="label" style="color: #92400e;">General Remarks</div>
          <div class="value" style="color: #78350f;">${enquiry.remark}</div>
        </div>
        ` : ""}

        <div class="field-card">
          <div class="label">Attachments</div>
          <div class="value" style="font-size: 13px;">${attachmentsHTML}</div>
        </div>
      </div>

      <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9;">
        <strong>Best regards,</strong><br/>
        <span style="color: #7c3aed; font-weight: 700;">Ginza Limited Merchant Team</span>
      </div>
    </div>
    
    <div class="footer">
      This is a system-generated notification from Ginza Limited ERP.<br/>
      Reply-To: <strong>${enquiry.email}</strong> | CC: <strong>mis.mumbai@ginzalimited.com</strong>
    </div>
  </div>
</body>
</html>
  `;
}

// Same helper for Supplier Quotation confirmation email
function generateSupplierReplyEmailHTML(enquiry: Enquiry, response: SupplierResponse) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 20px; }
    .container { max-width: 650px; margin: 0 auto; background: #ffffff; border-radius: 8px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); }
    .header { background-color: #065f46; padding: 24px; text-align: center; color: #ffffff; }
    .header-logo { font-size: 20px; font-weight: bold; letter-spacing: 0.05em; color: #34d399; }
    .header-title { font-size: 16px; margin-top: 4px; color: #a7f3d0; }
    .content { padding: 24px; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
    .field-card { background-color: #f1f5f9; padding: 12px; border-radius: 6px; }
    .label { font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 4px; }
    .value { font-size: 14px; color: #0f172a; font-weight: 500; }
    .footer { background-color: #f8fafc; padding: 16px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 12px; color: #64748b; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-logo">${enquiry.supplierName.toUpperCase()}</div>
      <div class="header-title">QUOTATION RECEIVED FOR STYLE ${enquiry.styleNumber}</div>
    </div>
    
    <div class="content">
      <div style="font-size: 15px; font-weight: bold; color: #0f172a; margin-bottom: 15px;">
        Supplier Quotation Submission (Ref Enq ID: ${enquiry.id})
      </div>

      <div class="grid">
        <div class="field-card" style="grid-column: span 1;">
          <div class="label">Composition / Fabric</div>
          <div class="value">${response.composition}</div>
        </div>
        <div class="field-card" style="grid-column: span 1;">
          <div class="label">Offered Price</div>
          <div class="value" style="color: #059669; font-weight: bold; font-size: 16px;">₹ ${response.price.toFixed(2)}</div>
        </div>
        <div class="field-card">
          <div class="label">Minimum Order Qty (MOQ)</div>
          <div class="value">${response.moq.toLocaleString()} pcs</div>
        </div>
        <div class="field-card">
          <div class="label">Min Color Qty (MCQ)</div>
          <div class="value">${response.mcq.toLocaleString()} pcs</div>
        </div>
        <div class="field-card" style="grid-column: span 2;">
          <div class="label">Expected Delivery Schedule</div>
          <div class="value">${response.deliveryTime}</div>
        </div>
        <div class="field-card" style="grid-column: span 2;">
          <div class="label">Supplier Remarks</div>
          <div class="value" style="font-style: italic; color: #334155;">"${response.remark || 'None'}"</div>
        </div>
      </div>

      <div style="margin-top: 15px; font-size: 13px; color: #475569;">
        This quotation has been automatically recorded in spreadsheet tab <strong>${enquiry.routingTab}</strong>.
      </div>
    </div>
    
    <div class="footer">
      Ginza Limited Supplier Portal Integration.<br/>
      Sent to Tracy at: <strong>tracychi@gmail.com</strong>.
    </div>
  </div>
</body>
</html>
  `;
}

// Helper to sync enquiries to user's real Google Sheet via Google Apps Script Web App
async function syncToGoogleSheets(enquiry: Enquiry) {
  try {
    const configPath = path.join(process.cwd(), "sheets-config.json");
    if (!fs.existsSync(configPath)) {
      console.log("No Google Sheets config file found. Real-time sync is skipped.");
      return;
    }
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    const webAppUrl = config.webAppUrl;
    if (!webAppUrl || !webAppUrl.startsWith("http")) {
      console.log("Google Sheets Web App URL is empty or invalid. Real-time sync is skipped.");
      return;
    }
    
    console.log(`Syncing enquiry ${enquiry.id} to Google Sheets as single nested payload...`);

    const response = await fetch(webAppUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(enquiry)
    });
    
    if (!response.ok) {
      console.error(`HTTP error syncing! status: ${response.status}`);
    } else {
      console.log(`Google Sheets sync completed for enquiry ${enquiry.id}`);
    }
  } catch (error) {
    console.error("Failed to sync to Google Sheets:", error);
  }
}

// Create express app
async function startServer() {
  const app = express();
  const PORT = 3000;

  // JSON and URL parsing body middlewares
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API to get sheets configuration
  app.get("/api/sheets-config", (req, res) => {
    const configPath = path.join(process.cwd(), "sheets-config.json");
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
        return res.json(config);
      } catch (e) {
        return res.json({ webAppUrl: "" });
      }
    }
    res.json({ webAppUrl: "" });
  });

  // API to update sheets configuration
  app.post("/api/sheets-config", (req, res) => {
    const { webAppUrl } = req.body;
    const configPath = path.join(process.cwd(), "sheets-config.json");
    try {
      fs.writeFileSync(configPath, JSON.stringify({ webAppUrl: webAppUrl || "" }, null, 2), "utf8");
      res.json({ success: true, webAppUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to save configuration" });
    }
  });

  // API 1: Get all Enquiries
  app.get("/api/enquiries", (req, res) => {
    res.json(enquiries);
  });

  // API 2: Get single Enquiry
  app.get("/api/enquiries/:id", (req, res) => {
    const enquiry = enquiries.find(e => e.id === req.params.id);
    if (!enquiry) {
      return res.status(404).json({ error: "Enquiry not found" });
    }
    res.json(enquiry);
  });

  // API 3: Post new Order Enquiry (Employee Frontend Submission)
  app.post("/api/enquiries", (req, res) => {
    const {
      email,
      type,
      supplierName,
      customerName,
      styleNumber,
      description,
      items,
      attachments,
      remark,
      date
    } = req.body;

    if (!email || !type || !supplierName || !styleNumber || !items || !Array.isArray(items)) {
      return res.status(400).json({ error: "Missing required form fields" });
    }

    const nextId = "enq_" + (enquiries.length + 1) + "_" + Math.floor(1000 + Math.random() * 9000);
    const routingTab = determineRoutingTab(email, type);

    // Formulate a dynamic self-referencing app URL based on the request host
    const reqHost = req.get("host");
    const reqProtocol = req.headers["x-forwarded-proto"] || req.protocol;
    const appUrl = (reqHost ? `${reqProtocol}://${reqHost}` : null) || process.env.APP_URL || `http://localhost:${PORT}`;
    const supplierResponseLink = `${appUrl}/?portal=supplier&id=${nextId}`;

    const newEnquiry: Enquiry = {
      id: nextId,
      date: date || new Date().toISOString().split("T")[0],
      email: email.trim(),
      type: type,
      supplierName: supplierName.trim(),
      customerName: (customerName || "General").trim(),
      styleNumber: styleNumber.trim(),
      description: (description || "").trim(),
      items: items,
      attachments: attachments || [],
      remark: (remark || "").trim(),
      routingTab: routingTab,
      supplierResponseLink: supplierResponseLink,
      status: "Pending",
      createdAt: new Date().toISOString()
    };

    enquiries.unshift(newEnquiry); // pre-pend new entries for dashboard visibility

    // Step 3: Cc emails logic setup
    const toEmail = "tracychi@gmail.com";
    let ccList = ["mis.mumbai@ginzalimited.com"]; // defaults

    const cleanSender = email.toLowerCase().trim();
    if (cleanSender === "merch1.soie@ginzalimited.com") {
      ccList.push("merch2.soie@ginzalimited.com");
    } else if (cleanSender === "merch2.soie@ginzalimited.com") {
      ccList.push("merch1.soie@ginzalimited.com");
    }

    const ccHeaderValue = ccList.join(", ");
    const emailBody = generateEnquiryEmailHTML(newEnquiry);

    // Save in Simulated Sent Email Outbox Logs
    const newEmail: EmailLog = {
      id: "mail_" + Math.floor(100000 + Math.random() * 900000),
      subject: `Order Enquiry Notification Ref: ${newEnquiry.id} (Style ${newEnquiry.styleNumber} / ${newEnquiry.customerName})`,
      to: toEmail,
      cc: ccHeaderValue,
      replyTo: newEnquiry.email,
      body: emailBody,
      date: new Date().toLocaleTimeString() + " " + new Date().toLocaleDateString(),
      headers: {
        "To": toEmail,
        "Cc": ccHeaderValue,
        "Reply-To": newEnquiry.email,
        "From": "erp-outbox@ginzalimited.com",
        "X-Routing-Destination-Tab": routingTab
      }
    };
    emails.unshift(newEmail);

    // Sync to user's configured real Google Sheet in the background
    syncToGoogleSheets(newEnquiry);

    res.status(201).json({
      success: true,
      enquiry: newEnquiry,
      emailSent: newEmail
    });
  });

  // API 3.5: Update existing Order Enquiry (Editable Option in Form)
  app.post("/api/enquiries/:id/update", (req, res) => {
    const { id } = req.params;
    const {
      email,
      type,
      supplierName,
      customerName,
      styleNumber,
      description,
      items,
      attachments,
      remark,
      date
    } = req.body;

    const index = enquiries.findIndex(e => e.id === id);
    if (index === -1) {
      return res.status(404).json({ error: "Enquiry not found" });
    }

    const existingEnquiry = enquiries[index];
    const routingTab = determineRoutingTab(email || existingEnquiry.email, type || existingEnquiry.type);

    // Formulate a dynamic self-referencing app URL based on the request host
    const reqHost = req.get("host");
    const reqProtocol = req.headers["x-forwarded-proto"] || req.protocol;
    const appUrl = (reqHost ? `${reqProtocol}://${reqHost}` : null) || process.env.APP_URL || `http://localhost:${PORT}`;
    const supplierResponseLink = `${appUrl}/?portal=supplier&id=${id}`;

    // Update with incoming values, pre-serving ID and supplier Response if already responded
    const updatedEnquiry: Enquiry = {
      ...existingEnquiry,
      date: date || existingEnquiry.date,
      email: email ? email.trim() : existingEnquiry.email,
      type: type || existingEnquiry.type,
      supplierName: supplierName ? supplierName.trim() : existingEnquiry.supplierName,
      customerName: customerName !== undefined ? customerName.trim() : existingEnquiry.customerName,
      styleNumber: styleNumber ? styleNumber.trim() : existingEnquiry.styleNumber,
      description: description !== undefined ? description.trim() : existingEnquiry.description,
      items: items || existingEnquiry.items,
      attachments: attachments || existingEnquiry.attachments,
      remark: remark !== undefined ? remark.trim() : existingEnquiry.remark,
      routingTab: routingTab,
      supplierResponseLink: supplierResponseLink
    };

    enquiries[index] = updatedEnquiry;

    // Trigger Notification update
    const toEmail = "tracychi@gmail.com";
    let ccList = ["mis.mumbai@ginzalimited.com"];
    const cleanSender = updatedEnquiry.email.toLowerCase().trim();
    if (cleanSender === "merch1.soie@ginzalimited.com") {
      ccList.push("merch2.soie@ginzalimited.com");
    } else if (cleanSender === "merch2.soie@ginzalimited.com") {
      ccList.push("merch1.soie@ginzalimited.com");
    }

    const ccHeaderValue = ccList.join(", ");
    const emailBody = generateEnquiryEmailHTML(updatedEnquiry);

    const newEmail: EmailLog = {
      id: "mail_edit_" + Math.floor(100000 + Math.random() * 900000),
      subject: `[UPDATED & CORRECTED] Order Enquiry Notification Ref: ${updatedEnquiry.id} (Style ${updatedEnquiry.styleNumber} / ${updatedEnquiry.customerName})`,
      to: toEmail,
      cc: ccHeaderValue,
      replyTo: updatedEnquiry.email,
      body: emailBody,
      date: new Date().toLocaleTimeString() + " " + new Date().toLocaleDateString(),
      headers: {
        "To": toEmail,
        "Cc": ccHeaderValue,
        "Reply-To": updatedEnquiry.email,
        "From": "erp-outbox@ginzalimited.com",
        "X-Routing-Destination-Tab": routingTab,
        "X-Correction": "True"
      }
    };
    emails.unshift(newEmail);

    // Sync to user's configured real Google Sheet in the background
    syncToGoogleSheets(updatedEnquiry);

    res.json({
      success: true,
      enquiry: updatedEnquiry,
      emailSent: newEmail
    });
  });

  // API 4: Supplier Response Submission (Quotation)
  app.post("/api/enquiries/:id/respond", (req, res) => {
    const { id } = req.params;
    const { composition, moq, mcq, price, deliveryTime, remark } = req.body;

    const enquiryIndex = enquiries.findIndex(e => e.id === id);
    if (enquiryIndex === -1) {
      return res.status(404).json({ error: "Enquiry reference id not found" });
    }

    const enquiry = enquiries[enquiryIndex];

    const responseObj: SupplierResponse = {
      composition: composition || "N/A",
      moq: Number(moq) || 0,
      mcq: Number(mcq) || 0,
      price: Number(price) || 0,
      deliveryTime: deliveryTime || "N/A",
      remark: remark || "",
      respondedAt: new Date().toISOString()
    };

    enquiry.supplierResponse = responseObj;
    enquiry.status = "Responded";

    // Write-back to the in-memory array
    enquiries[enquiryIndex] = enquiry;

    // Trigger update mail log
    const toEmail = "tracychi@gmail.com";
    const ccHeader = `mis.mumbai@ginzalimited.com, ${enquiry.email}`; // cc includes MIS and the original employee!
    const resBody = generateSupplierReplyEmailHTML(enquiry, responseObj);

    const replyEmail: EmailLog = {
      id: "mail_reply_" + Math.floor(100000 + Math.random() * 900000),
      subject: `RE: Quotation Confirmed - Ref Log: ${enquiry.id} (${enquiry.supplierName} - Style ${enquiry.styleNumber})`,
      to: toEmail,
      cc: ccHeader,
      replyTo: "no-reply.supplier@ginzalimited.com",
      body: resBody,
      date: new Date().toLocaleTimeString() + " " + new Date().toLocaleDateString(),
      headers: {
        "To": toEmail,
        "Cc": ccHeader,
        "Reply-To": "no-reply.supplier@ginzalimited.com",
        "From": "supplier-portal@ginzalimited.com"
      }
    };
    emails.unshift(replyEmail);

    // Sync to user's configured real Google Sheet in the background
    syncToGoogleSheets(enquiry);

    res.json({
      success: true,
      enquiry,
      emailSent: replyEmail
    });
  });

  // API 5: Get Outbox Emails
  app.get("/api/emails", (req, res) => {
    res.json(emails);
  });

  // API 6: Delete Enquiry (for reset operations if needed)
  app.delete("/api/enquiries/:id", (req, res) => {
    enquiries = enquiries.filter(e => e.id !== req.params.id);
    res.json({ success: true });
  });

  // API 7: Clear logs / Reset database
  app.post("/api/reset", (req, res) => {
    // Reset to initial
    enquiries = [
      {
        id: "enq_1",
        date: "2026-06-10",
        email: "merch1.soie@ginzalimited.com",
        type: "New",
        supplierName: "Vimal Fabrics Ltd",
        customerName: "SOIE",
        styleNumber: "C-920",
        description: "Lace Back Bikini Brief with soft elastic waistband",
        items: [
          { styleNo: "C-920-A", color: "Blush Pink", quantity: 1500, size: "Medium" },
          { styleNo: "C-920-B", color: "Crimson Red", quantity: 1200, size: "Large" },
          { styleNo: "C-920-C", color: "Midnight Black", quantity: 1800, size: "Small" }
        ],
        attachments: [
          { name: "lace_design_back.png", url: "https://drive.google.com/drive/folders/ginza-enquiries/lace_design_back.png", size: "1.4 MB", uploadedAt: "2026-06-10 14:22" },
          { name: "elastic_specs.pdf", url: "https://drive.google.com/drive/folders/ginza-enquiries/elastic_specs.pdf", size: "380 KB", uploadedAt: "2026-06-10 14:25" }
        ],
        remark: "Required with supreme soft lace. Standard fit.",
        routingTab: "Order Enquiries",
        supplierResponseLink: "https://drive.google.com/drive/folders/ginza-enquiries/enq_1",
        status: "Pending",
        createdAt: "2026-06-10T14:20:00Z"
      },
      {
        id: "enq_2",
        date: "2026-06-08",
        email: "merch2.soie@ginzalimited.com",
        type: "Repeat",
        supplierName: "Reliance Synthetics",
        customerName: "SOIE",
        styleNumber: "R-440",
        description: "Classic Microfiber Daily Bra",
        items: [
          { styleNo: "R-440-Rep", color: "Nude Skin", quantity: 5000, size: "34B" },
          { styleNo: "R-440-Rep", color: "White Rose", quantity: 3500, size: "36C" }
        ],
        attachments: [
          { name: "approved_shade_card.png", url: "https://drive.google.com/drive/folders/ginza-enquiries/approved_shade_card.png", size: "2.1 MB", uploadedAt: "2026-06-08 10:11" }
        ],
        remark: "R-440 repeat fabric order. Match dye lots perfectly.",
        routingTab: "Order Enquiries",
        supplierResponseLink: "https://drive.google.com/drive/folders/ginza-enquiries/enq_2",
        status: "Responded",
        createdAt: "2026-06-08T10:10:00Z",
        supplierResponse: {
          composition: "88% Nylon, 12% Spandex",
          moq: 1000,
          mcq: 500,
          price: 185.50,
          deliveryTime: "2026-07-25",
          remark: "Price held firm. Dye matching confirmed against shade card.",
          respondedAt: "2026-06-09T09:30:00Z"
        }
      },
      {
        id: "enq_3",
        date: "2026-06-09",
        email: "export.team@ginzalimited.com",
        type: "New Launch",
        supplierName: "Yarn & Thread Imp",
        customerName: "Nordstrom Int",
        styleNumber: "EXPORT-50",
        description: "Cotton Lurex Loungewear Shorts",
        items: [
          { styleNo: "EX-50-A", color: "Silver Gray", quantity: 3000, size: "S/M" },
          { styleNo: "EX-50-B", color: "Gold Beige", quantity: 3000, size: "L/XL" }
        ],
        attachments: [],
        remark: "Urgent shipment for Winter launch.",
        routingTab: "Order Enquiries",
        supplierResponseLink: "https://drive.google.com/drive/folders/ginza-enquiries/enq_3",
        status: "Pending",
        createdAt: "2026-06-09T18:15:00Z"
      }
    ];
    emails = [];
    res.json({ success: true, message: "System state reset successfully" });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Ginza Limited ERP Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start Ginza ERP Server:", err);
});
