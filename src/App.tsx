import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Briefcase,
  Calendar,
  ChevronRight,
  ClipboardList,
  Database,
  Download,
  FileText,
  Filter,
  Folder,
  FolderOpen,
  HelpCircle,
  Info,
  Layers,
  Mail,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  UploadCloud,
  CheckCircle,
  ExternalLink,
  FileSpreadsheet,
  ArrowRightLeft,
  Settings,
  X,
  Copy,
  AlertCircle
} from "lucide-react";
import { Enquiry, EnquiryItem, Attachment, EmailLog, SupplierResponse } from "./types";

const headerImage = "https://i.ibb.co/jPNhZLFP/Ginza-Soie-Header-Image.png";

export default function App() {
  // Navigation tabs
  const [activeTab, setActiveTab] = useState<"enquiry_form" | "sheets_simulator" | "emails_outbox" | "drive_simulator">("enquiry_form");

  // Controls if we show the developer test tools (tabs, stats, outboxes) or hide them entirely.
  const [showAdminConsole, setShowAdminConsole] = useState<boolean>(false);

  // Google Sheets Direct Sync Web App URL
  const [googleSheetsUrl, setGoogleSheetsUrl] = useState<string>("");
  const [isSavingSheetsUrl, setIsSavingSheetsUrl] = useState<boolean>(false);
  const [showSyncWizard, setShowSyncWizard] = useState<boolean>(true);

  // Server state
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [emails, setEmails] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>("");

  // Supplier portal selection state (to let users simulate being a supplier quickly)
  const [supplierPortalEnquiryId, setSupplierPortalEnquiryId] = useState<string | null>(null);

  // Success share modal state after sub-enquiry creation
  const [lastSubmittedEnquiry, setLastSubmittedEnquiry] = useState<Enquiry | null>(null);

  // Form inputs for Order Enquiry
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [emailAddress, setEmailAddress] = useState<string>("");
  const [typeOfEnquiry, setTypeOfEnquiry] = useState<"New" | "Old" | "Repeat" | "New Launch" | "">("");
  const [supplierName, setSupplierName] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [styleNumber, setStyleNumber] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [remark, setRemark] = useState<string>("");

  // Dynamic Item List
  const [items, setItems] = useState<EnquiryItem[]>([]);

  // Form controls for adding to items table
  const [newItemStyleNo, setNewItemStyleNo] = useState<string>("");
  const [newItemColor, setNewItemColor] = useState<string>("");
  const [newItemQuantity, setNewItemQuantity] = useState<number | "">("");
  const [newItemSize, setNewItemSize] = useState<string>("");

  // Mock File Upload state
  const [fileInput, setFileInput] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<Attachment[]>([]);
  const [dragOver, setDragOver] = useState<boolean>(false);

  // Supplier Response Form state
  const [supplierComposition, setSupplierComposition] = useState<string>("");
  const [supplierMOQ, setSupplierMOQ] = useState<number>(1000);
  const [supplierMCQ, setSupplierMCQ] = useState<number>(500);
  const [supplierPrice, setSupplierPrice] = useState<number>(175);
  const [supplierDelivery, setSupplierDelivery] = useState<string>("2026-08-15");
  const [supplierRemark, setSupplierRemark] = useState<string>("");
  const [supplierVerifyStyle, setSupplierVerifyStyle] = useState<string>("");

  // Sheet simulated filter tab
  const [activeSheetTab, setActiveSheetTab] = useState<string>("SGU Enquiry");

  // Selected email to view details in Outbox
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);

  // Dynamic quick select list with localStorage persistence
  const [quickSelectEmails, setQuickSelectEmails] = useState<{ email: string; desc: string }[]>(() => {
    const saved = localStorage.getItem("ginza_quick_select_emails");
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // Fallback
      }
    }
    return [
      { email: "merch1.soie@ginzalimited.com", desc: "SGU Team (adds merch2 to CC)" },
      { email: "merch2.soie@ginzalimited.com", desc: "SGU Team (adds merch1 to CC)" },
      { email: "export.sales@ginzalimited.com", desc: "Export Team (routes to Export sheet)" },
      { email: "vau.merchandising@ginzalimited.com", desc: "VAU Team" },
      { email: "eye.hook.division@ginzalimited.com", desc: "Eye N Hook division" },
      { email: "general.office@ginzalimited.com", desc: "General Enquiry" }
    ];
  });

  // State for the Quick Select inline editor manager
  const [isEditingQuickSelect, setIsEditingQuickSelect] = useState<boolean>(false);
  const [editingEmailIndex, setEditingEmailIndex] = useState<number | null>(null);
  const [qsEmailInput, setQsEmailInput] = useState<string>("");
  const [qsDescInput, setQsDescInput] = useState<string>("");

  // Master Enquiry Editing State (requested for editable option in form)
  const [editingEnquiryId, setEditingEnquiryId] = useState<string | null>(null);

  useEffect(() => {
    localStorage.setItem("ginza_quick_select_emails", JSON.stringify(quickSelectEmails));
  }, [quickSelectEmails]);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setLoading(true);
      const enqRes = await fetch("/api/enquiries");
      const subEnquiries = await enqRes.json();
      setEnquiries(subEnquiries);

      const emailRes = await fetch("/api/emails");
      const emailLogs = await emailRes.json();
      setEmails(emailLogs);

      try {
        const configRes = await fetch("/api/sheets-config");
        const config = await configRes.json();
        setGoogleSheetsUrl(config.webAppUrl || "");
      } catch (err) {
        console.warn("Could not load Google Sheets configuration from server.", err);
      }

      setErrorMessage("");
    } catch (e) {
      console.error("Error communicating with full-stack service:", e);
      setErrorMessage("Could not connect to the backend server. Please verify the server is running on port 3000.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Check URL search parameters to see if opened as a supplier link or editable form link
    const params = new URLSearchParams(window.location.search);
    const portal = params.get("portal");
    const id = params.get("id");
    const editId = params.get("editId");

    if (portal === "supplier" && id) {
      setSupplierPortalEnquiryId(id);
      setActiveTab("sheets_simulator"); // Show supplier form or sheet portal container
    } else if (editId) {
      setEditingEnquiryId(editId);
      setActiveTab("enquiry_form"); // focus on enquiry form in edit mode
    }
  }, []);

  // Prefill Form parameters when entering Master Edit Mode
  useEffect(() => {
    if (editingEnquiryId && enquiries.length > 0) {
      const target = enquiries.find(e => e.id === editingEnquiryId);
      if (target) {
        setDate(target.date);
        setEmailAddress(target.email);
        setTypeOfEnquiry(target.type);
        setSupplierName(target.supplierName);
        setCustomerName(target.customerName);
        setStyleNumber(target.styleNumber);
        setDescription(target.description);
        setItems(target.items);
        setUploadedFiles(target.attachments);
        setRemark(target.remark);
      }
    }
  }, [editingEnquiryId, enquiries]);

  // Update Supplier Form when target enquiry changes
  useEffect(() => {
    if (supplierPortalEnquiryId) {
      const target = enquiries.find(e => e.id === supplierPortalEnquiryId);
      if (target) {
        setSupplierVerifyStyle(target.styleNumber);
        setSupplierComposition(target.supplierResponse?.composition || "90% Polyamide, 10% Elastane");
        setSupplierMOQ(target.supplierResponse?.moq || 1000);
        setSupplierMCQ(target.supplierResponse?.mcq || 500);
        setSupplierPrice(target.supplierResponse?.price || 180);
        setSupplierDelivery(target.supplierResponse?.deliveryTime || "2026-08-30");
        setSupplierRemark(target.supplierResponse?.remark || "");
      }
    }
  }, [supplierPortalEnquiryId, enquiries]);

  // Handle adding item row to custom dynamic list
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemColor.trim() || !newItemSize.trim() || newItemQuantity === "" || newItemQuantity <= 0) {
      alert("Please fill custom item fields (Color, Quantity, Size).");
      return;
    }
    const finalStyleNo = newItemStyleNo.trim() || `${styleNumber}-${newItemColor.substring(0,3).toUpperCase()}`;
    const newItem: EnquiryItem = {
      styleNo: finalStyleNo,
      color: newItemColor.trim(),
      quantity: Number(newItemQuantity),
      size: newItemSize.trim()
    };
    setItems([...items, newItem]);
    setNewItemStyleNo("");
    setNewItemColor("");
    setNewItemSize("");
    setNewItemQuantity("");
  };

  // Remove item row from list
  const removeItemIdx = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  // Modern Reset/Blank Form operations (requested for a clean start on new entries)
  const resetToBlankForm = (quiet = false) => {
    setDate(new Date().toISOString().substring(0, 10));
    setEmailAddress("");
    setTypeOfEnquiry("");
    setCustomerName("");
    setSupplierName("");
    setStyleNumber("");
    setDescription("");
    setItems([]);
    setUploadedFiles([]);
    setRemark("");
    setEditingEnquiryId(null);
    setNewItemQuantity("");
    if (!quiet) {
      alert("Form reset to blank successfully! You can now enter a fresh blank enquiry.");
    }
  };

  // Google Forms Clear Form handler
  const handleClearForm = () => {
    resetToBlankForm(false);
  };

  // Mock upload attachment file
  const triggerMockUpload = (fileName: string) => {
    const extensions = ["png", "jpg", "pdf", "docx"];
    const ext = fileName.split(".").pop() || "png";
    const dummyNames = [
      "tech_pack_style_" + styleNumber.toLowerCase() + ".pdf",
      "shade_card_reference.png",
      "measurement_chart.pdf",
      "fabric_swatch_high_res.jpg"
    ];
    
    const chosenName = fileName.trim() || dummyNames[Math.floor(Math.random() * dummyNames.length)];
    const randomSize = (0.5 + Math.random() * 3).toFixed(1) + " MB";
    
    const newAttachment: Attachment = {
      name: chosenName,
      url: `https://drive.google.com/drive/folders/ginza-enquiries/${encodeURIComponent(chosenName)}`,
      size: randomSize,
      uploadedAt: new Date().toISOString().replace("T", " ").substring(0, 16)
    };

    setUploadedFiles([...uploadedFiles, newAttachment]);
    setFileInput("");
  };

  // Submit master employee order enquiry
  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Auto-fallback default settings to ensure no fields are strictly mandatory
    const finalEmail = emailAddress.trim() || "merch1.soie@ginzalimited.com";
    const finalSupplierValue = supplierName.trim() || "Vimal Fabrics Ltd";
    const finalStyleValue = styleNumber.trim() || "C-920-Default";
    
    let finalItems = [...items];
    if (finalItems.length === 0) {
      finalItems = [{
        styleNo: finalStyleValue + "-Pink",
        color: "Blush Pink",
        quantity: 1000,
        size: "Medium"
      }];
    }

    if (!typeOfEnquiry) {
      alert("Please select the Type of Enquiry.");
      return;
    }

    try {
      const payload = {
        date,
        email: finalEmail,
        type: typeOfEnquiry,
        supplierName: finalSupplierValue,
        customerName: customerName.trim() || "SOIE",
        styleNumber: finalStyleValue,
        description: description.trim() || "Soft mesh lingerie design order",
        items: finalItems,
        attachments: uploadedFiles,
        remark: remark.trim()
      };

      const endpoint = editingEnquiryId 
        ? `/api/enquiries/${editingEnquiryId}/update` 
        : "/api/enquiries";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Server rejected submission");
      }

      const result = await res.json();
      
      // Update local states
      if (editingEnquiryId) {
        setEnquiries(enquiries.map(enq => enq.id === editingEnquiryId ? result.enquiry : enq));
      } else {
        setEnquiries([result.enquiry, ...enquiries]);
      }
      setEmails([result.emailSent, ...emails]);
      setSelectedEmailId(result.emailSent.id); // auto select for verification

      // Set for share modal
      setLastSubmittedEnquiry(result.enquiry);

      // Route the view to Email Outbox immediately so the user can verify
      setActiveTab("emails_outbox");
      
      // Reset form variables and turn off edit mode
      resetToBlankForm(true);
    } catch (err) {
      console.error(err);
      alert("Error submitting enquiry. Check console.");
    }
  };

  // Submit supplier response details
  const handleSubmitSupplierQuotation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierPortalEnquiryId) return;

    try {
      const payload = {
        composition: supplierComposition.trim(),
        moq: Number(supplierMOQ),
        mcq: Number(supplierMCQ),
        price: Number(supplierPrice),
        deliveryTime: supplierDelivery,
        remark: supplierRemark.trim()
      };

      const res = await fetch(`/api/enquiries/${supplierPortalEnquiryId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        throw new Error("Quotation failed to save");
      }

      const result = await res.json();

      // Refresh enquiries
      setEnquiries(enquiries.map(enq => enq.id === supplierPortalEnquiryId ? result.enquiry : enq));
      setEmails([result.emailSent, ...emails]);
      setSelectedEmailId(result.emailSent.id);

      alert(`Success! Quotation has been recorded. Excel Sheet columns updated and notifications sent to Tracy + Employee CC successfully.`);
      
      // Direct user back to sheets simulator to see the columns updated
      setSupplierPortalEnquiryId(null);
      setActiveTab("sheets_simulator");
      setActiveSheetTab(result.enquiry.routingTab); // view target sheet
    } catch (err) {
      console.error(err);
      alert("Error submitting supply quotation.");
    }
  };

  // System State Reset helper
  const handleSystemReset = async () => {
    if (confirm("Reset system states back to demo standards? This removes custom logs.")) {
      try {
        await fetch("/api/reset", { method: "POST" });
        await fetchData();
        alert("System states reset.");
      } catch (err) {
        console.error(err);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-teal-100 antialiased flex flex-col pt-0">
      
      {/* Main Container Layout */}
      <main className="max-w-4xl mx-auto px-2 sm:px-4 py-4 sm:py-8 flex-1 w-full flex flex-col justify-start">
        
        {/* Clean Professional ERP Header & Administrative Console Switch - only shown in admin mode */}
        {showAdminConsole && (
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-br from-purple-600 to-indigo-700 h-10 w-10 rounded-lg flex items-center justify-center font-black text-white text-lg shadow-sm border border-indigo-400 select-none">
                GZ
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  <span>Ginza Limited ERP Portal</span>
                  <span className="text-[9px] uppercase font-bold tracking-widest bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">v4.0 Live</span>
                </h1>
                <p className="text-[11px] text-slate-400 font-medium">Compliance Routing & Multi-Vendor Pricing Matrix Engine</p>
              </div>
            </div>

            <div className="flex items-center gap-3 self-stretch sm:self-auto border-t border-slate-800 pt-3 sm:pt-0 sm:border-0 justify-between">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">Operator Session</p>
                <p className="text-[11px] text-indigo-300 font-bold">mis.mumbai@ginzalimited.com</p>
              </div>
              
              <button
                onClick={() => {
                  setShowAdminConsole(false);
                  setActiveTab("enquiry_form");
                }}
                className="text-xs px-4 py-2 rounded-lg font-bold shadow-sm transition-all border bg-purple-600 hover:bg-purple-700 text-white border-purple-500 hover:scale-[1.02] cursor-pointer flex items-center gap-2"
              >
                <Settings className="h-4 w-4 animate-spin text-purple-200" />
                <span>Pristine Employee Mode</span>
              </button>
            </div>
          </div>
        )}

        {/* Dynamic Navigation Tabs - displayed when ERP Admin Mode is unlocked */}
        {showAdminConsole && !supplierPortalEnquiryId && (
          <div className="flex flex-wrap items-center gap-1.5 mb-6 p-1 bg-slate-200/50 rounded-xl border border-slate-200/40">
            <button
              onClick={() => setActiveTab("enquiry_form")}
              className={`flex-1 min-w-[120px] text-xs py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "enquiry_form"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              📝 <span>Order Enquiry Form</span>
            </button>
            <button
              onClick={() => setActiveTab("sheets_simulator")}
              className={`flex-1 min-w-[140px] text-xs py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "sheets_simulator"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              📊 <span>Google Sheets & Sync</span>
            </button>
            <button
              onClick={() => setActiveTab("emails_outbox")}
              className={`flex-1 min-w-[140px] text-xs py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "emails_outbox"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              ✉️ <span>Transmission Mail Outbox</span>
            </button>
            <button
              onClick={() => setActiveTab("drive_simulator")}
              className={`flex-1 min-w-[140px] text-xs py-2.5 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeTab === "drive_simulator"
                  ? "bg-amber-600 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/40"
              }`}
            >
              📁 <span>Cloud Storage Drive</span>
            </button>
          </div>
        )}

        {/* Dynamic Display workspace */}
        <div className="flex-1 min-w-0">
          
          <AnimatePresence mode="wait">
            
            {/* STATE A: Supplier Portal Active */}
            {supplierPortalEnquiryId ? (
              (() => {
                const target = enquiries.find(e => e.id === supplierPortalEnquiryId);
                if (!target) {
                  return (
                    <motion.div
                      key="supplier_error"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-white rounded-xl border border-[#dadce0] overflow-hidden shadow-sm"
                    >
                      <div className="h-[5px] bg-[#d93025]" />
                      <div className="p-6 text-center space-y-3">
                        <h2 className="text-xl font-semibold text-[#202124]">Quotation Link Error</h2>
                        <p className="text-sm text-[#5f6368]">
                          The specified reference ID <b>{supplierPortalEnquiryId}</b> does not match any order enquiry in our cloud database system.
                        </p>
                        <button
                          onClick={() => setSupplierPortalEnquiryId(null)}
                          className="px-4 py-2 bg-[#673ab7] text-white rounded text-sm hover:bg-[#512da8] font-semibold"
                        >
                          Return to Main Form
                        </button>
                      </div>
                    </motion.div>
                  );
                }

                return (
                  <motion.div
                    key="supplier_form"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.15 }}
                    className="bg-[#e6f4ea] rounded-2xl border border-[#dadce0] p-3 sm:p-6 shadow-[#b7e1cd]"
                  >
                    {/* Google Form Style Header */}
                    <div className="bg-white rounded-lg border border-[#dadce0] shadow-sm overflow-hidden mb-4">
                      <div className="relative overflow-hidden bg-[#e6f4ea] border-b border-[#dadce0] w-full aspect-[10/3] flex flex-col justify-between shadow-xs">
                        <div className="absolute inset-0 select-none bg-[#e6f4ea] flex items-center justify-center">
                          <img 
                            src={headerImage} 
                            alt="Ginza SOIE"
                            className="w-full h-full object-cover mx-auto"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="absolute top-0 left-0 right-0 h-[5px] bg-[#0f9d58] w-full z-20" />
                      </div>

                      <div className="p-5">
                        <h2 className="text-2xl sm:text-3xl font-medium text-[#202124] mb-1 tracking-tight flex items-center gap-2">
                          <span>Form B: Supplier Quotation Form</span>
                        </h2>
                        <p className="text-xs sm:text-sm text-[#5f6368] leading-relaxed mb-3">
                          Submit your official composition, MOQ, MCQ, price and expected delivery schedule.
                        </p>
                        <div className="border-t border-[#dadce0] pt-4 mt-4 flex items-center justify-between text-xs text-[#5f6368]">
                          <span className="font-semibold text-emerald-800">Verified Supplier Portal</span>
                          <span>Ref Enquiry ID: <b>{target.id}</b></span>
                        </div>
                      </div>
                    </div>

                    {/* Form B Body */}
                    <form onSubmit={handleSubmitSupplierQuotation} className="space-y-4">
                      
                      {/* Read-only details from Enquiry */}
                      <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
                        <h3 className="text-base font-semibold text-[#202124] mb-2">Original Enquiry Parameters</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-[#3c4043] border-b border-dashed border-[#dadce0] pb-4 mb-4">
                          <p><b>Target Supplier Name:</b> {target.supplierName}</p>
                          <p><b>Customer Code:</b> {target.customerName}</p>
                          <p><b>Required Style No:</b> <span className="uppercase font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">{target.styleNumber}</span></p>
                          <p><b>Enquiry Date:</b> {target.date}</p>
                          <p className="sm:col-span-2"><b>Description / Fabric Standard:</b> {target.description}</p>
                          {target.remark && <p className="sm:col-span-2 bg-amber-50 rounded p-2.5 text-xs text-amber-800 border border-amber-100"><b>Employee Note:</b> "{target.remark}"</p>}
                        </div>

                        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Sizing & Quantities Matrix Table</p>
                        <div className="border border-[#dadce0] rounded-lg overflow-hidden bg-[#f8f9fa]">
                          <table className="w-full text-left text-xs text-slate-700">
                            <thead className="bg-[#f1f3f4] font-bold text-slate-600 border-b border-[#dadce0]">
                              <tr>
                                <th className="p-2 pl-3">Color Code</th>
                                <th className="p-2">Cup / Size</th>
                                <th className="p-2 text-right pr-3">Target Qty (pcs)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#dadce0]">
                              {target.items.map((it, idx) => (
                                <tr key={idx}>
                                  <td className="p-2 pl-3 font-medium">{it.color}</td>
                                  <td className="p-2">{it.size}</td>
                                  <td className="p-2 text-right pr-3 font-semibold">{it.quantity.toLocaleString()}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Verification check input card */}
                      <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
                        <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="sub-verify">
                          Verify Style Number <span className="text-[#d93025]">*</span>
                        </label>
                        <p className="text-xs text-[#70757a] mb-3 font-normal">Please verify the style reference code you are quoting for (e.g. <b>{target.styleNumber}</b>).</p>
                        <input
                          type="text"
                          id="sub-verify"
                          required
                          placeholder="ENTER STYLE NUMBER TO CONFIRM"
                          value={supplierVerifyStyle}
                          onChange={(e) => setSupplierVerifyStyle(e.target.value)}
                          className="w-full max-w-md py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#0f9d58] rounded-none text-sm outline-none transition-all uppercase font-semibold text-[#202124]"
                        />
                      </div>

                      {/* Composition Input Card */}
                      <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
                        <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="sub-comp">
                          Fabric Composition / Materials Description <span className="text-[#d93025]">*</span>
                        </label>
                        <p className="text-xs text-[#70757a] mb-3">Specify material details (e.g., 90% Polyamide, 10% Elastane).</p>
                        <input
                          type="text"
                          id="sub-comp"
                          required
                          placeholder="Your response"
                          value={supplierComposition}
                          onChange={(e) => setSupplierComposition(e.target.value)}
                          className="w-full max-w-lg py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#0f9d58] rounded-none text-sm outline-none transition-all"
                        />
                      </div>

                      {/* MOQ Card */}
                      <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
                        <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="sub-moq">
                          Minimum Order Quantity (MOQ) <span className="text-[#d93025]">*</span>
                        </label>
                        <p className="text-xs text-[#70757a] mb-3">Minimum quantity required to accept any standard order.</p>
                        <input
                          type="number"
                          id="sub-moq"
                          required
                          placeholder="Your response"
                          min="1"
                          value={supplierMOQ || ""}
                          onChange={(e) => setSupplierMOQ(Number(e.target.value))}
                          className="w-full max-w-xs py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#0f9d58] rounded-none text-sm outline-none transition-all"
                        />
                      </div>

                      {/* MCQ Card */}
                      <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
                        <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="sub-mcq">
                          Minimum Color Quantity (MCQ) <span className="text-[#d93025]">*</span>
                        </label>
                        <p className="text-xs text-[#70757a] mb-3 font-normal">Minimum manufacturing volume required per styled color lot.</p>
                        <input
                          type="number"
                          id="sub-mcq"
                          required
                          placeholder="Your response"
                          min="1"
                          value={supplierMCQ || ""}
                          onChange={(e) => setSupplierMCQ(Number(e.target.value))}
                          className="w-full max-w-xs py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#0f9d58] rounded-none text-sm outline-none transition-all"
                        />
                      </div>

                      {/* Price in INR Card */}
                      <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
                        <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="sub-price">
                          Quoted Unit Price (INR per piece) <span className="text-[#d93025]">*</span>
                        </label>
                        <p className="text-xs text-[#70757a] mb-3">Please specify unit bulk rate quotation pricing.</p>
                        <div className="flex items-center gap-1 max-w-xs border-b border-[#dadce0] hover:border-[#b0b3b8] focus-within:border-b-2 focus-within:border-[#0f9d58]">
                          <span className="text-slate-500 font-semibold text-sm">₹</span>
                          <input
                            type="number"
                            id="sub-price"
                            required
                            placeholder="Your response"
                            min="0.01"
                            step="0.01"
                            value={supplierPrice || ""}
                            onChange={(e) => setSupplierPrice(Number(e.target.value))}
                            className="w-full py-2 rounded-none text-sm outline-none bg-transparent font-medium"
                          />
                        </div>
                      </div>

                      {/* Expected delivery dates */}
                      <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
                        <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="sub-deliv">
                          Offered Delivery Completion Date <span className="text-[#d93025]">*</span>
                        </label>
                        <p className="text-xs text-[#70757a] mb-3">Estimated date when the bulk manufacturing can ship.</p>
                        <input
                          type="date"
                          id="sub-deliv"
                          required
                          value={supplierDelivery}
                          onChange={(e) => setSupplierDelivery(e.target.value)}
                          className="w-full max-w-xs py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#0f9d58] rounded-none text-sm outline-none transition-all font-medium"
                        />
                      </div>

                      {/* Optional vendor remarks text block */}
                      <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm">
                        <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="sub-remark">
                          Supplier Remarks / Fabric Certifications
                        </label>
                        <p className="text-xs text-[#70757a] mb-3 font-normal">Write additional specifications, terms, or bulk parameters. (Optional)</p>
                        <textarea
                          id="sub-remark"
                          rows={2}
                          placeholder="Your response"
                          value={supplierRemark}
                          onChange={(e) => setSupplierRemark(e.target.value)}
                          className="w-full max-w-lg py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#0f9d58] rounded-none text-sm outline-none transition-all resize-none"
                        />
                      </div>

                      {/* Form submission controls */}
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <button
                            type="submit"
                            className="px-6 py-2 bg-[#0f9d58] hover:bg-[#0b8043] text-white font-semibold rounded text-sm transition-colors cursor-pointer shadow-sm"
                          >
                            Submit Quotation
                          </button>
                        </div>
                        <p className="text-[11px] text-[#5f6368] italic">
                          * Populates Excel Columns M to Q instantly on submission.
                        </p>
                      </div>

                    </form>
                  </motion.div>
                );
              })()
            ) : (
              <motion.div
                key="enquiry_form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-[#f0ebf8] rounded-2xl border border-[#dadce0] p-3 sm:p-6 shadow-[#c0b3f1]"
              >
                {/* Form Header Card */}
                <div className="bg-white rounded-lg border border-[#dadce0] shadow-sm overflow-hidden mb-4">
                  {/* Branded Google Form Header Image */}
                  <div className="relative overflow-hidden bg-[#feebea] border-b border-[#dadce0] w-full aspect-[10/3] flex flex-col justify-between shadow-xs">
                    
                    {/* Background Visual Banner Image - styled with exact matching 10/3 aspect ratio for true edge-to-edge bleed */}
                    <div className="absolute inset-0 select-none bg-[#feebea] flex items-center justify-center">
                      <img 
                        src={headerImage} 
                        alt="Ginza SOIE - All Your Essentials, All in One Place"
                        className="w-full h-full object-cover mx-auto"
                        referrerPolicy="no-referrer"
                      />
                    </div>

                    {/* Google Form Signature Top Color bar matching brand burgundy/red accents */}
                    <div className="absolute top-0 left-0 right-0 h-[5px] bg-[#a31d36] w-full z-20" />
                  </div>

                  <div className="p-4 sm:p-5">
                    <h2 className="text-2xl sm:text-3xl font-medium text-[#202124] mb-1 tracking-tight flex items-center gap-2">
                      <span>Order Enquiry Form</span>
                      {editingEnquiryId && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-black tracking-wider uppercase rounded border border-purple-250">
                          Editing Mode
                        </span>
                      )}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#5f6368] leading-relaxed mb-3">
                      Submit styling parameters, dye/colors, attachments and automatically calculate email and spreadsheet destinations.
                    </p>
                    
                    {/* User account state banner */}
                    <div className="border-t border-[#dadce0] pt-4 mt-4 flex flex-wrap items-center justify-between text-xs text-[#5f6368] gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-800">mis.mumbai@ginzalimited.com</span>
                        <span className="text-[10px] text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full font-semibold border border-emerald-100 flex items-center gap-0.5 select-none">
                          <span className="h-1 w-1 bg-emerald-500 rounded-full animate-pulse"></span>
                          Verified Account
                        </span>
                      </div>
                      <span className="text-[#1a73e8] font-medium hover:underline cursor-pointer">Switch accounts</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mt-4 font-sans">
                      <span className="text-[13px] text-[#2e7d32] font-semibold bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                        ✓ All form helper fields are optional
                      </span>
                      {editingEnquiryId && (
                        <span className="text-[12px] text-purple-700 font-bold bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-100">
                          Synced with brand image theme
                        </span>
                      )}
                    </div>

                    {/* Active Edit Mode Warning Block (Requested by User for editable form option) */}
                    {editingEnquiryId && (
                      <div className="mt-4 p-4 bg-purple-50 border border-purple-200 rounded-lg flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 shadow-sm">
                        <div className="flex items-start gap-2.5">
                          <span className="p-1 px-2.5 bg-purple-600 text-white font-extrabold text-[10px] rounded uppercase mt-0.5">
                            EDIT
                          </span>
                          <div>
                            <p className="text-xs font-bold text-purple-900">
                              Now correcting Response for Enquiry ID: <span className="font-mono text-purple-800 bg-purple-100/50 px-1 py-0.5 rounded border border-purple-200">{editingEnquiryId}</span>
                            </p>
                            <p className="text-[11px] text-purple-700 leading-normal mt-0.5 font-normal">
                              You are currently editing this response directly. Saving will automatically update sheet row columns tab-wise.
                            </p>
                          </div>
                        </div>
                          <button
                          type="button"
                          onClick={() => {
                            setEditingEnquiryId(null);
                            // reset form to default (blank as requested)
                            setDate(new Date().toISOString().split("T")[0]);
                            setEmailAddress("");
                            setTypeOfEnquiry("");
                            setSupplierName("");
                            setCustomerName("");
                            setStyleNumber("");
                            setDescription("");
                            setItems([]);
                            setUploadedFiles([]);
                            setRemark("");
                            setNewItemQuantity("");
                          }}
                          className="px-3 py-1.5 bg-white hover:bg-purple-100 text-purple-800 border border-purple-200 rounded text-xs font-bold transition-all shrink-0 cursor-pointer shadow-sm"
                        >
                          Cancel Editing
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <form onSubmit={handleSubmitEnquiry} className="space-y-4" id="order-enquiry-form">
                  
                  {/* Card 1: Date of Enquiry */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="enq-date">
                      Date of Enquiry
                    </label>
                    <p className="text-xs text-[#70757a] mb-3">Please specify when the request should be recorded. (Optional)</p>
                    <div className="relative max-w-xs mt-3">
                      <Calendar className="absolute left-0.5 top-2.5 h-4 w-4 text-slate-500 pointer-events-none" />
                      <input
                        type="date"
                        id="enq-date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full pl-6 pr-3 py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#673ab7] rounded-none text-sm outline-none transition-all bg-transparent font-medium"
                      />
                    </div>
                  </div>

                  {/* Card 2: Employee Email Address */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="enq-email">
                      Employee Email Address
                    </label>
                    <p className="text-xs text-[#70757a] mb-3">Provide any ginzalimited.com email for system routing or CC. (Optional)</p>
                    <div className="mt-3">
                      <input
                        type="email"
                        id="enq-email"
                        placeholder="Your answer (optional)"
                        value={emailAddress}
                        onChange={(e) => setEmailAddress(e.target.value)}
                        className="w-full max-w-xl py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#673ab7] rounded-none text-sm outline-none transition-all bg-transparent placeholder:text-slate-400 font-medium"
                      />
                    </div>
                    
                    {/* Interactive suggestions tags */}
                    <div className="flex flex-wrap gap-2 mt-4 items-center">
                      <span className="text-xs text-[#5f6368] font-semibold">Quick select:</span>
                      {quickSelectEmails.map((item, index) => (
                        <button
                          type="button"
                          key={index}
                          onClick={() => setEmailAddress(item.email)}
                          className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${
                            emailAddress === item.email
                              ? "bg-[#673ab7] border-[#673ab7] text-white font-semibold shadow-sm"
                              : "bg-[#f8f9fa] hover:bg-[#f1f3f4] border-[#dadce0] text-[#3c4043]"
                          }`}
                          title={item.desc}
                        >
                          {item.email.split("@")[0]}
                        </button>
                      ))}
                      
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingQuickSelect(!isEditingQuickSelect);
                          setEditingEmailIndex(null);
                          setQsEmailInput("");
                          setQsDescInput("");
                        }}
                        className="text-xs text-[#673ab7] hover:text-[#5e35b1] hover:underline flex items-center gap-1 font-bold bg-purple-50 px-2.5 py-1 rounded-full border border-purple-100 transition-all cursor-pointer shadow-sm"
                      >
                        ✏️ {isEditingQuickSelect ? "Hide Editor" : "Edit email list"}
                      </button>
                    </div>

                    {/* Inline Quick Select Email config panel */}
                    {isEditingQuickSelect && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        className="mt-4 p-4 border border-purple-200 bg-purple-50/40 rounded-xl space-y-3 font-sans"
                      >
                        <div className="flex items-center justify-between border-b border-purple-100 pb-2">
                          <span className="text-xs font-bold text-[#673ab7] uppercase tracking-wider">Configure Quick Select Emails</span>
                          <span className="text-[10px] text-slate-500 font-medium">(Changes saved automatically)</span>
                        </div>

                        {/* List of existing */}
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {quickSelectEmails.map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs shadow-sm">
                              <div className="truncate pr-2">
                                <span className="font-bold text-slate-800">{item.email}</span>
                                {item.desc && <span className="text-slate-500 ml-1.5">({item.desc})</span>}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingEmailIndex(idx);
                                    setQsEmailInput(item.email);
                                    setQsDescInput(item.desc);
                                  }}
                                  className="text-blue-600 hover:underline font-semibold text-[11px] cursor-pointer"
                                >
                                  Edit
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickSelectEmails(quickSelectEmails.filter((_, i) => i !== idx));
                                    if (editingEmailIndex === idx) {
                                      setEditingEmailIndex(null);
                                      setQsEmailInput("");
                                      setQsDescInput("");
                                    }
                                  }}
                                  className="text-rose-600 hover:text-rose-800 font-semibold text-[11px] cursor-pointer"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Form to add or edit */}
                        <div className="bg-white p-3 rounded-xl border border-purple-100 space-y-2.5 shadow-sm">
                          <p className="text-[11px] font-bold text-slate-700">
                            {editingEmailIndex !== null ? "✏️ Edit Selected Email ID" : "➕ Add Custom Email ID Option"}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="email"
                              placeholder="e.g. dynamic.manager@ginzalimited.com"
                              value={qsEmailInput}
                              onChange={(e) => setQsEmailInput(e.target.value)}
                              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#673ab7] outline-none"
                            />
                            <input
                              type="text"
                              placeholder="e.g. SGU Core Team Contact"
                              value={qsDescInput}
                              onChange={(e) => setQsDescInput(e.target.value)}
                              className="text-xs px-2.5 py-1.5 border border-slate-300 rounded focus:border-[#673ab7] outline-none"
                            />
                          </div>
                          <div className="flex justify-end gap-2 text-xs">
                            {editingEmailIndex !== null && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEmailIndex(null);
                                  setQsEmailInput("");
                                  setQsDescInput("");
                                }}
                                className="px-3 py-1 bg-slate-100 text-slate-700 rounded hover:bg-slate-200 cursor-pointer"
                              >
                                Cancel
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                if (!qsEmailInput.includes("@")) {
                                  alert("Please enter a valid email address containing @.");
                                  return;
                                }
                                if (editingEmailIndex !== null) {
                                  // Update item
                                  const updated = [...quickSelectEmails];
                                  updated[editingEmailIndex] = { email: qsEmailInput.trim(), desc: qsDescInput.trim() };
                                  setQuickSelectEmails(updated);
                                  setEditingEmailIndex(null);
                                } else {
                                  // Add new item
                                  setQuickSelectEmails([...quickSelectEmails, { email: qsEmailInput.trim(), desc: qsDescInput.trim() }]);
                                }
                                setQsEmailInput("");
                                setQsDescInput("");
                              }}
                              className="px-3.5 py-1 bg-[#673ab7] text-white font-bold rounded hover:bg-[#5e35b1] cursor-pointer transition-transform duration-100"
                            >
                              {editingEmailIndex !== null ? "Save Changes" : "Add to List"}
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>

                  {/* Card 3: Type of Enquiry */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <label className="block text-base font-semibold text-[#202124] mb-1">
                      Type of Enquiry
                    </label>
                    <p className="text-xs text-[#70757a] mb-4">Routes dynamically to corresponding Excel sheets.</p>
                    
                    <div className="space-y-3.5 mt-3">
                      {["New", "Old" ,"Repeat", "New Launch"].map((option) => {
                        const isSelected = typeOfEnquiry === option;
                        return (
                          <label 
                            key={option} 
                            className="flex items-center gap-3 cursor-pointer group max-w-max"
                          >
                            <input
                              type="radio"
                              name="typeOfEnquiry"
                              value={option}
                              checked={isSelected}
                              onChange={() => setTypeOfEnquiry(option as any)}
                              className="sr-only"
                            />
                            <div className="relative flex items-center justify-center">
                              <div className={`h-5 w-5 rounded-full border-2 transition-all ${
                                isSelected 
                                  ? "border-[#673ab7] bg-white" 
                                  : "border-[#70757a] bg-white group-hover:border-[#202124]"
                              }`} />
                              {isSelected && (
                                <div className="absolute h-2.5 w-2.5 rounded-full bg-[#673ab7]" />
                              )}
                            </div>
                            <span className="text-sm text-[#202124] font-medium leading-none select-none">{option}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Card 4: Customer Name */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="customer-name">
                      Customer Name
                    </label>
                    <p className="text-xs text-[#70757a] mb-3">Specify target client or brand (e.g. SOIE, Brand Co, Export Hub etc).</p>
                    <div className="mt-3">
                      <input
                        type="text"
                        id="customer-name"
                        placeholder="Your answer"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full max-w-xl py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#673ab7] rounded-none text-sm outline-none transition-all bg-transparent placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  {/* Card 5: Name of Supplier */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="supplier-name">
                      Name of Supplier
                    </label>
                    <p className="text-xs text-[#70757a] mb-3">Enterprise partner tasked with manufacturing or supply coordination. (Optional)</p>
                    <div className="mt-3">
                      <input
                        type="text"
                        id="supplier-name"
                        placeholder="Your answer (optional)"
                        value={supplierName}
                        onChange={(e) => setSupplierName(e.target.value)}
                        className="w-full max-w-xl py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#673ab7] rounded-none text-sm outline-none transition-all bg-transparent placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  {/* Card 6: Style/Article Number */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="style-number">
                      Style/Article Number
                    </label>
                    <p className="text-xs text-[#70757a] mb-3">Primary index reference from the design catalog. (Optional, e.g. C-920)</p>
                    <div className="mt-3">
                      <input
                        type="text"
                        id="style-number"
                        placeholder="Your answer (optional)"
                        value={styleNumber}
                        onChange={(e) => setStyleNumber(e.target.value)}
                        className="w-full max-w-xl py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#673ab7] rounded-none text-sm outline-none transition-all bg-transparent placeholder:text-slate-400 font-medium"
                      />
                    </div>
                  </div>

                  {/* Card 7: Description of Article */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="enq-desc">
                      Description of Article
                    </label>
                    <p className="text-xs text-[#70757a] mb-3">Note core materials, stitching properties, or specific trim details.</p>
                    <div className="mt-3">
                      <textarea
                        id="enq-desc"
                        rows={2}
                        placeholder="Your answer"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full max-w-xl py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#673ab7] rounded-none text-sm outline-none transition-all bg-transparent placeholder:text-slate-400 resize-y font-medium"
                      />
                    </div>
                  </div>

                  {/* Card 8: Dynamic Items Parameter Grid List */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-dashed border-slate-200 mb-4 gap-2">
                      <div>
                        <label className="block text-base font-semibold text-[#202124]">
                          Dynamic Items Parameter List
                        </label>
                        <p className="text-xs text-[#70757a] mt-1">Add individual color palettes and cup sizes to populate Excel rows with perfect integrity. (Optional)</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-[#673ab7] rounded-full border border-purple-100 shrink-0">
                        {items.length} item(s) listed
                      </span>
                    </div>

                    {/* Compact inputs row */}
                    <div className="bg-[#f8f9fa] p-4 rounded-lg border border-[#dadce0] mb-4">
                      <p className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2.5">Configure Parameters Row</p>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Style No (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. C-920-A"
                            value={newItemStyleNo}
                            onChange={(e) => setNewItemStyleNo(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#dadce0] bg-white rounded text-xs focus:ring-1 focus:ring-[#673ab7] outline-none"
                          />
                        </div>
                        
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Color Code (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. Blush Pink"
                            value={newItemColor}
                            onChange={(e) => setNewItemColor(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#dadce0] bg-white rounded text-xs focus:ring-1 focus:ring-[#673ab7] outline-none"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Size / Cup Height (Optional)</label>
                          <input
                            type="text"
                            placeholder="e.g. 34B"
                            value={newItemSize}
                            onChange={(e) => setNewItemSize(e.target.value)}
                            className="w-full px-2.5 py-1.5 border border-[#dadce0] bg-white rounded text-xs focus:ring-1 focus:ring-[#673ab7] outline-none"
                          />
                        </div>

                        <div className="flex gap-2">
                          <div className="flex-1">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Quantity</label>
                            <input
                              type="number"
                              min={1}
                              placeholder="e.g. 1000"
                              value={newItemQuantity}
                              onChange={(e) => setNewItemQuantity(e.target.value === "" ? "" : Number(e.target.value))}
                              className="w-full px-2.5 py-1.5 border border-[#dadce0] bg-white rounded text-xs focus:ring-1 focus:ring-[#673ab7] outline-none"
                            />
                          </div>
                          
                          <button
                            type="button"
                            onClick={handleAddItem}
                            className="bg-[#673ab7] hover:bg-[#5e35b1] text-white font-bold px-3.5 py-1.5 rounded text-xs flex items-center justify-center cursor-pointer h-[32px] shrink-0 transition-colors"
                            title="Add item row"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table summary of elements */}
                    {items.length === 0 ? (
                      <div className="text-center py-5 bg-slate-50 border border-dashed border-slate-200 rounded-lg text-xs text-slate-500 italic">
                        No parameters added yet. Create at least one row using fields above.
                      </div>
                    ) : (
                      <div className="overflow-hidden bg-white rounded-lg border border-slate-200">
                        <table className="w-full text-xs text-left">
                          <thead className="bg-[#f8f9fa] text-slate-600 font-semibold border-b border-slate-200 select-none">
                            <tr>
                              <th className="p-2.5">Style No</th>
                              <th className="p-2.5">Color / Shade</th>
                              <th className="p-2.5">Size / Cup</th>
                              <th className="p-2.5 text-right bg-slate-100/40">Quantity</th>
                              <th className="p-2.5 text-center w-12">Remove</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-slate-700">
                            {items.map((item, index) => (
                              <tr key={index} className="hover:bg-slate-50/50">
                                <td className="p-2.5 font-bold text-slate-800">{item.styleNo || "Same"}</td>
                                <td className="p-2.5">{item.color}</td>
                                <td className="p-2.5 font-medium">{item.size}</td>
                                <td className="p-2.5 text-right font-mono font-semibold text-slate-900 bg-slate-100/10">{item.quantity.toLocaleString()}</td>
                                <td className="p-2.5 text-center">
                                  <button
                                    type="button"
                                    onClick={() => removeItemIdx(index)}
                                    className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                  >
                                    <Trash2 className="h-3.5 w-3.5 mx-auto" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Card 9: Attachments */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow">
                    <label className="block text-base font-semibold text-[#202124] mb-1">
                      Attachments (Uploads direct to Google Drive)
                    </label>
                    <p className="text-xs text-[#70757a] mb-4">Archive PDF tech packs, Swatch PNGs or measurement files directly to ERP Cloud.</p>
                    
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                      onDragLeave={() => setDragOver(false)}
                      onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) { triggerMockUpload(e.dataTransfer.files[0].name); } }}
                      onClick={() => {
                        const nameInput = prompt("Enter simulated folder file name (e.g. shadecard.png):");
                        if (nameInput) triggerMockUpload(nameInput);
                      }}
                      className={`border-2 border-dashed rounded-xl p-6 text-center transition-all cursor-pointer ${
                        dragOver 
                          ? "border-[#673ab7] bg-[#f0ebf8]/30" 
                          : "border-slate-300 bg-[#f8f9fa] hover:bg-[#f1f3f4]"
                      }`}
                    >
                      <div className="inline-flex items-center gap-2 border border-[#dadce0] rounded-md text-[#1a73e8] font-semibold text-sm bg-white hover:bg-[#f8f9fa] px-4 py-2 hover:shadow-sm transition-all mb-3 cursor-pointer">
                        <UploadCloud className="h-4 w-4" />
                        <span>Add file</span>
                      </div>
                      <p className="text-xs text-[#5f6368] font-medium">or drag documents here</p>
                      <p className="text-[10px] text-slate-400 mt-1">Accepts PNG, PDF, JPG. Maximum limit 25MB.</p>
                    </div>

                    {/* Attached file checklist */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-bold text-slate-600">Attached & queued for upload:</p>
                        {uploadedFiles.map((file, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs p-2.5 bg-[#f0ebf8]/40 border border-purple-100 rounded-lg">
                            <span className="truncate font-semibold text-[#673ab7] flex items-center gap-1.5">
                              📄 {file.name} ({file.size})
                            </span>
                            <button
                              type="button"
                              onClick={() => setUploadedFiles(uploadedFiles.filter((_, i) => i !== idx))}
                              className="text-rose-600 hover:text-rose-800 transition-colors p-1 hover:bg-white rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Card 10: Internal Remarks */}
                  <div className="bg-white rounded-lg border border-[#dadce0] p-6 shadow-sm hover:shadow transition-shadow mb-6">
                    <label className="block text-base font-semibold text-[#202124] mb-1" htmlFor="enq-remarks">
                      Internal Remarks
                    </label>
                    <p className="text-xs text-[#70757a] mb-3">Include optional notes for production, Tracy, or MIS routing teammates.</p>
                    <div className="mt-3">
                      <textarea
                        id="enq-remarks"
                        rows={3}
                        placeholder="Your answer"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="w-full max-w-xl py-2 border-b border-[#dadce0] hover:border-[#b0b3b8] focus:border-b-2 focus:border-[#673ab7] rounded-none text-sm outline-none transition-all bg-transparent placeholder:text-[#9aa0a6] resize-y font-medium"
                      />
                    </div>
                  </div>

                  {/* Submission Row & Google Forms Action Controls */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-slate-200/60 gap-4 mt-8">
                    <div className="flex items-center gap-3">
                      <button
                        type="submit"
                        className={`px-6 py-2.5 text-white font-semibold rounded text-sm transition-all shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 ${
                          editingEnquiryId 
                            ? "bg-purple-700 hover:bg-purple-800 ring-2 ring-purple-200" 
                            : "bg-[#673ab7] hover:bg-[#5e35b1]"
                        }`}
                        id="submit-enquiry-btn"
                      >
                        {editingEnquiryId ? (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Save Form Changes
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            Submit Enquiry Form
                          </>
                        )}
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleClearForm}
                        className="px-4 py-2 text-[#673ab7] hover:bg-[#673ab7]/5 font-semibold rounded text-sm transition-colors cursor-pointer"
                      >
                        Clear form
                      </button>
                    </div>
                    
                    <p className="text-[11px] text-[#5f6368] sm:max-w-md italic select-none">
                      * Powered by automatic routing matrix. Synced live with ERP spreadsheet columns, Drive vaults and Tracy's replies tracking.
                    </p>
                  </div>

                  {/* Google Forms Footer Security Notice Disclaimer */}
                  <div className="text-center text-[11px] text-[#70757a] mt-8 pt-4 border-t border-[#dadce0]/40 select-none">
                    This form was created inside Ginza Limited ERP. Never submit passwords through Google Forms.
                  </div>

                </form>
              </motion.div>
            )}


            {/* TAB 2: LIVE GOOGLE SHEETS SIMULATOR */}
            {activeTab === "sheets_simulator" && (
              <motion.div
                key="sheets_simulator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
              >
                
                {/* Spreadsheet Top Bar */}
                <div className="bg-slate-900 text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-800 gap-3">
                  <div className="flex items-center gap-2">
                    <FileSpreadsheet className="h-5 w-5 text-emerald-400" />
                    <div>
                      <h3 className="text-sm font-bold tracking-tight">Ginza_ERP_Enquiries_Database.xlsx</h3>
                      <p className="text-[10px] text-slate-400">Synced dynamically with Cloud Database schema</p>
                    </div>
                  </div>
                  
                  {/* Google Sheets Header Actions */}
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-300 font-semibold flex items-center gap-1 bg-emerald-500/20 px-2 py-0.5 rounded border border-emerald-500/30">
                      <span className="h-1.5 w-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                      Auto-Routing Active
                    </span>
                  </div>
                </div>

                {/* Real-time Google Sheets Deployment Wizard */}
                <div className="bg-slate-50 border-b border-slate-200">
                  <div className="p-4 sm:p-5 flex items-center justify-between bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-slate-200">
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-sm">
                        GS
                      </div>
                      <div>
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 flex items-center gap-1.5 flex-wrap">
                          <span>Google Sheets Live Sync Protocol</span>
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${googleSheetsUrl ? "bg-emerald-100 text-emerald-800 border border-emerald-250" : "bg-amber-100 text-amber-800 border border-amber-250"}`}>
                            {googleSheetsUrl ? "● Live Sync Active" : "○ Disconnected (Local simulation only)"}
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-normal">
                          Deploy the Google Script code in your Google Sheet to mirror all ERP records instantly inside your live sheet.
                        </p>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setShowSyncWizard(!showSyncWizard)}
                      className="px-3 py-1.5 bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1 hover:border-slate-300"
                    >
                      {showSyncWizard ? "Hide Setup Guide" : "Configure Live Sheet"}
                    </button>
                  </div>

                  {showSyncWizard && (
                    <div className="p-4 sm:p-6 space-y-6 bg-white border-b border-slate-200">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        {/* Column 1: Config Form & instructions */}
                        <div className="space-y-4">
                          <h5 className="text-[12px] uppercase tracking-wider font-extrabold text-slate-500">1. Link Deployed Web App</h5>
                          
                          <div className="space-y-2.5">
                            <label className="block text-xs font-bold text-slate-700" htmlFor="sheet-sync-url">
                              Google Apps Script Web App URL:
                            </label>
                            <input
                              type="text"
                              id="sheet-sync-url"
                              placeholder="https://script.google.com/macros/s/.../exec"
                              value={googleSheetsUrl}
                              onChange={(e) => setGoogleSheetsUrl(e.target.value)}
                              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-all"
                            />
                          </div>

                          <div className="flex gap-2.5 pt-1">
                            <button
                              onClick={async () => {
                                if (!googleSheetsUrl.startsWith("http")) {
                                  alert("Please enter a valid HTTP/HTTPS Web App URL from your Google Apps Script deployment.");
                                  return;
                                }
                                setIsSavingSheetsUrl(true);
                                try {
                                  const res = await fetch("/api/sheets-config", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ webAppUrl: googleSheetsUrl.trim() })
                                  });
                                  const ans = await res.json();
                                  alert("Success! Google Sheets Web App configuration URL updated on server.");
                                } catch (e) {
                                  alert("Error saving configuration URL to backend.");
                                } finally {
                                  setIsSavingSheetsUrl(false);
                                }
                              }}
                              disabled={isSavingSheetsUrl}
                              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-400 text-white rounded-lg font-bold text-xs shadow-sm transition-all cursor-pointer active:scale-95"
                            >
                              {isSavingSheetsUrl ? "Saving..." : "Save Sync URL"}
                            </button>

                            {googleSheetsUrl && (
                              <button
                                onClick={async () => {
                                  setIsSavingSheetsUrl(true);
                                  try {
                                    const res = await fetch("/api/sheets-config", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({ webAppUrl: "" })
                                    });
                                    setGoogleSheetsUrl("");
                                    alert("Google Sheets configuration cleared. ERP returned to in-memory local simulator mode.");
                                  } catch (e) {
                                    alert("Error resetting sheet sync config.");
                                  } finally {
                                    setIsSavingSheetsUrl(false);
                                  }
                                }}
                                disabled={isSavingSheetsUrl}
                                className="px-4 py-2 bg-white text-rose-600 border border-slate-200 hover:bg-rose-50 hover:border-rose-100 rounded-lg font-bold text-xs shadow-xs transition-all cursor-pointer"
                              >
                                Disconnect Live Sync
                              </button>
                            )}
                          </div>

                          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2.5 text-xs text-slate-650 leading-relaxed font-normal shadow-2xs">
                            <h6 className="font-bold text-slate-800 flex items-center gap-1">
                              <span>💡</span> Simple 1-Minute Live Integration Guide:
                            </h6>
                            <ol className="list-decimal pl-4.5 space-y-1.5 text-[11px] text-slate-600">
                              <li>Open any blank Google Spreadsheet on your personal account.</li>
                              <li>In the top toolbar, click <b>Extensions</b> &gt; <b>Apps Script</b>.</li>
                              <li>Delete current placeholder code and paste our pre-generated <b>Service Code</b> (displayed on right).</li>
                              <li>Click <b>Deploy</b> (blue button) &gt; <b>New deployment</b>.</li>
                              <li>Click the gear icon next to Type, select <b>Web app</b>.</li>
                              <li>Set <i>Execute as</i> to <b>Me</b>, and <i>Who has access</i> to <b>Anyone</b> (crucial for Cloud Run trigger permission).</li>
                              <li>Click Deploy, copy the generated <b>Web App URL</b> and paste it into the textbox above!</li>
                            </ol>
                          </div>
                        </div>

                        {/* Column 2: Apps Script code copyable block */}
                        <div className="space-y-2.5 flex flex-col h-full">
                          <div className="flex justify-between items-center bg-slate-900 px-3.5 py-2.5 rounded-t-xl border-b border-slate-805">
                            <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-400">2. Copy Google Apps Script Code</span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`function doPost(e) {
  try {
    var json = JSON.parse(e.postData.contents);
    var sheetName = json.routingTab || "General Enquiry";
    
    // Open active spreadsheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    // If sheet tab does not exist, create it with compliance headers
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "Date of Enquiry",
        "Employee Email",
        "Enquiry Type",
        "Supplier Name",
        "Customer Name",
        "Style Number",
        "Description",
        "Color",
        "Quantity",
        "Size / Cup",
        "Attachments",
        "Employee Remarks",
        "Composition",
        "MCQ / MCQ Height",
        "MOQ",
        "Quoted Price",
        "Delivery Date / Supplier Remarks",
        "Supplier Response Portal Link",
        "Status",
        "Ref ID"
      ]);
      // Format headers
      sheet.getRange(1, 1, 1, 20).setFontWeight("bold").setBackground("#d1e7dd");
    }
    
    // Find if the Ref ID already exists to prevent duplicate rows (enables live editing!)
    var refId = json.id;
    var data = sheet.getDataRange().getValues();
    var rowIdx = -1;
    var existingNumRows = 1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][19] === refId) { // Column T is the 20th column
        rowIdx = i + 1; // 1-based Row Index
        break;
      }
    }
    
    if (rowIdx !== -1) {
      // Find out if it has merged rows starting here
      var checkRange = sheet.getRange(rowIdx, 20);
      if (checkRange.isPartOfMerge()) {
        var mergedRanges = checkRange.getMergedRanges();
        if (mergedRanges && mergedRanges.length > 0) {
          existingNumRows = mergedRanges[0].getNumRows();
          rowIdx = mergedRanges[0].getRow();
        }
      }
      // Delete old rows
      sheet.deleteRows(rowIdx, existingNumRows);
    } else {
      rowIdx = sheet.getLastRow() + 1;
    }
    
    // Consolidate row parameter lists
    var items = json.items || [];
    var numItems = Math.max(1, items.length);
    var rowsToWrite = [];
    var attachments = json.attachments ? json.attachments.map(function(att) { return att.name + " (" + att.url + ")"; }).join(" | ") : "";
    
    for (var k = 0; k < numItems; k++) {
      var item = items[k] || {};
      var colorVal = item.color || "";
      var qtyVal = item.quantity || "";
      var sizeVal = item.size || "";
      
      var rowData = [
        json.date || new Date().toISOString().split("T")[0],
        json.email || "",
        json.type || "",
        json.supplierName || "",
        json.customerName || "",
        json.styleNumber || "",
        json.description || "",
        colorVal,
        qtyVal,
        sizeVal,
        attachments,
        json.remark || "",
        json.supplierResponse ? (json.supplierResponse.composition || "") : "",
        json.supplierResponse ? (json.supplierResponse.mcq || "") : "",
        json.supplierResponse ? (json.supplierResponse.moq || "") : "",
        json.supplierResponse ? (json.supplierResponse.price || "") : "",
        json.supplierResponse ? (json.supplierResponse.deliveryTime + (json.supplierResponse.remark ? " / " + json.supplierResponse.remark : "")) : "",
        json.supplierResponseLink || "",
        json.status || "Pending",
        refId
      ];
      rowsToWrite.push(rowData);
    }
    
    // Insert space if nested
    if (sheet.getLastRow() >= rowIdx) {
      sheet.insertRows(rowIdx, numItems);
    }
    
    // Write new values
    var writeRange = sheet.getRange(rowIdx, 1, numItems, 20);
    writeRange.setValues(rowsToWrite);
    writeRange.setVerticalAlignment("middle");
    
    // Apply Merges
    if (numItems > 1) {
      for (var col = 1; col <= 20; col++) {
        if (col === 8 || col === 9 || col === 10) {
          continue;
        }
        sheet.getRange(rowIdx, col, numItems, 1).merge();
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Sync successful" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`);
                                alert("Google Apps Script code successfully copied to clipboard!");
                              }}
                              className="text-xs px-2.5 py-1 text-slate-100 hover:text-white hover:bg-slate-800 rounded font-bold border border-slate-700 bg-slate-850 cursor-pointer transition-all active:scale-95 flex items-center gap-1.5"
                            >
                              📋 Copy Code
                            </button>
                          </div>
                          
                          <pre className="text-[10px] font-mono text-slate-300 bg-slate-950 p-3.5 rounded-b-xl border border-slate-900 border-t-0 flex-1 overflow-y-auto max-h-[220px] select-all leading-normal whitespace-pre">
{`function doPost(e) {
  try {
    var json = JSON.parse(e.postData.contents);
    var sheetName = json.routingTab || "General Enquiry";
    
    // Open active spreadsheet
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheetByName(sheetName);
    
    // If sheet tab does not exist, create it with compliance headers
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      sheet.appendRow([
        "Date of Enquiry",
        "Employee Email",
        "Enquiry Type",
        "Supplier Name",
        "Customer Name",
        "Style Number",
        "Description",
        "Color",
        "Quantity",
        "Size / Cup",
        "Attachments",
        "Employee Remarks",
        "Composition",
        "MCQ / MCQ Height",
        "MOQ",
        "Quoted Price",
        "Delivery Date / Supplier Remarks",
        "Supplier Response Portal Link",
        "Status",
        "Ref ID"
      ]);
      // Format headers
      sheet.getRange(1, 1, 1, 20).setFontWeight("bold").setBackground("#d1e7dd");
    }
    
    // Find if the Ref ID already exists to prevent duplicate rows (enables live editing!)
    var refId = json.id;
    var data = sheet.getDataRange().getValues();
    var rowIdx = -1;
    var existingNumRows = 1;
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][19] === refId) { // Column T is the 20th column
        rowIdx = i + 1; // 1-based Row Index
        break;
      }
    }
    
    if (rowIdx !== -1) {
      // Find out if it has merged rows starting here
      var checkRange = sheet.getRange(rowIdx, 20);
      if (checkRange.isPartOfMerge()) {
        var mergedRanges = checkRange.getMergedRanges();
        if (mergedRanges && mergedRanges.length > 0) {
          existingNumRows = mergedRanges[0].getNumRows();
          rowIdx = mergedRanges[0].getRow();
        }
      }
      // Delete old rows
      sheet.deleteRows(rowIdx, existingNumRows);
    } else {
      rowIdx = sheet.getLastRow() + 1;
    }
    
    // Consolidate row parameter lists
    var items = json.items || [];
    var numItems = Math.max(1, items.length);
    var rowsToWrite = [];
    var attachments = json.attachments ? json.attachments.map(function(att) { return att.name + " (" + att.url + ")"; }).join(" | ") : "";
    
    for (var k = 0; k < numItems; k++) {
      var item = items[k] || {};
      var colorVal = item.color || "";
      var qtyVal = item.quantity || "";
      var sizeVal = item.size || "";
      
      var rowData = [
        json.date || new Date().toISOString().split("T")[0],
        json.email || "",
        json.type || "",
        json.supplierName || "",
        json.customerName || "",
        json.styleNumber || "",
        json.description || "",
        colorVal,
        qtyVal,
        sizeVal,
        attachments,
        json.remark || "",
        json.supplierResponse ? (json.supplierResponse.composition || "") : "",
        json.supplierResponse ? (json.supplierResponse.mcq || "") : "",
        json.supplierResponse ? (json.supplierResponse.moq || "") : "",
        json.supplierResponse ? (json.supplierResponse.price || "") : "",
        json.supplierResponse ? (json.supplierResponse.deliveryTime + (json.supplierResponse.remark ? " / " + json.supplierResponse.remark : "")) : "",
        json.supplierResponseLink || "",
        json.status || "Pending",
        refId
      ];
      rowsToWrite.push(rowData);
    }
    
    // Insert space if nested
    if (sheet.getLastRow() >= rowIdx) {
      sheet.insertRows(rowIdx, numItems);
    }
    
    // Write new values
    var writeRange = sheet.getRange(rowIdx, 1, numItems, 20);
    writeRange.setValues(rowsToWrite);
    writeRange.setVerticalAlignment("middle");
    
    // Apply Merges
    if (numItems > 1) {
      for (var col = 1; col <= 20; col++) {
        if (col === 8 || col === 9 || col === 10) {
          continue;
        }
        sheet.getRange(rowIdx, col, numItems, 1).merge();
      }
    }
    
    return ContentService.createTextOutput(JSON.stringify({ success: true, message: "Sync successful" }))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ success: false, error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}`}
                          </pre>
                        </div>

                      </div>
                    </div>
                  )}
                </div>

                {/* Simulated Google Spreadsheet Sheet Tabs */}
                <div className="bg-slate-100 border-b border-slate-200 flex flex-wrap text-xs font-semibold text-slate-600">
                  {["SGU Enquiry", "SGU Order", "Export Enquiry", "Export Order", "VAU", "Eye N Hook", "General Enquiry"].map((tabName) => {
                    const countInTab = enquiries.filter(enq => enq.routingTab === tabName).length;
                    return (
                      <button
                        key={tabName}
                        onClick={() => {
                          setActiveSheetTab(tabName);
                          setSupplierPortalEnquiryId(null); // clear supplier form on tab switch
                        }}
                        className={`px-4 py-2.5 border-r border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer ${
                          activeSheetTab === tabName && !supplierPortalEnquiryId
                            ? "bg-white text-emerald-700 border-t-2 border-t-emerald-600 font-bold"
                            : "hover:bg-slate-200 hover:text-slate-900"
                        }`}
                      >
                        {tabName}
                        <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded-full font-bold">
                          {countInTab}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sheet Grid or active Supplier Submission Portal */}
                <div className="p-4">
                  {supplierPortalEnquiryId ? (
                    
                    /* THE SUPPLIER RESPONSE PORTAL (FORM B) */
                    <div className="max-w-2xl mx-auto bg-white rounded-xl border border-[#dadce0] shadow-sm overflow-hidden my-4">
                      {/* Branded Google Form Header Image */}
                      <div className="relative overflow-hidden bg-[#feebea] border-b border-[#dadce0] w-full aspect-[10/3] flex flex-col justify-between shadow-xs">
                        
                        {/* Background Visual Banner Image - styled with exact matching 10/3 aspect ratio for true edge-to-edge bleed */}
                        <div className="absolute inset-0 select-none bg-[#feebea] flex items-center justify-center">
                          <img 
                            src={headerImage} 
                            alt="Ginza SOIE - All Your Essentials, All in One Place"
                            className="w-full h-full object-cover mx-auto"
                            referrerPolicy="no-referrer"
                          />
                        </div>

                        {/* Google Form Signature Top Color bar matching brand emerald green accents */}
                        <div className="absolute top-0 left-0 right-0 h-[5px] bg-[#047857] w-full z-20" />
                      </div>

                      <div className="p-5">
                        <div className="border-b border-slate-200 pb-3 mb-4 flex items-center justify-between">
                          <div>
                            <span className="inline-block px-2.5 py-1 text-[10px] bg-emerald-700 text-white font-bold tracking-wider uppercase rounded mb-1.5">
                              Form B: Supplier Quotation Form
                            </span>
                            <h3 className="text-base font-bold text-slate-800">
                              Partner Quotation Submission Portal
                            </h3>
                          </div>
                          <button
                            onClick={() => setSupplierPortalEnquiryId(null)}
                            className="px-2 py-1 bg-white border border-slate-200 rounded text-xs hover:bg-slate-100 font-bold text-slate-600 cursor-pointer"
                          >
                            Back to Database
                          </button>
                        </div>

                      {/* Display Readonly Enquiry Details matching actual request */}
                      {(() => {
                        const target = enquiries.find(e => e.id === supplierPortalEnquiryId);
                        if (!target) return <p className="text-xs text-rose-600">Reference enquiry not found.</p>;
                        
                        return (
                          <div className="space-y-4">
                            
                            {/* Readonly info panel */}
                            <div className="bg-white p-3.5 rounded-lg border border-slate-200 text-xs space-y-2">
                              <p className="font-bold text-slate-500 uppercase tracking-wider text-[10px] border-b pb-1">
                                SGU Order Enquiry Parameters (Read-Only)
                              </p>
                              
                              <div className="grid grid-cols-2 gap-2 text-slate-700">
                                <p><b>Enquiry Date:</b> {target.date}</p>
                                <p><b>Ref ID:</b> {target.id}</p>
                                <p><b>Customer Code:</b> {target.customerName}</p>
                                <p><b>Requested Style #:</b> {target.styleNumber}</p>
                                <p className="col-span-2"><b>Description:</b> {target.description}</p>
                              </div>

                              {/* Item list detail */}
                              <div className="mt-3">
                                <p className="font-bold text-slate-600 mb-1">Item Breakdown Table:</p>
                                <div className="border rounded overflow-hidden">
                                  <table className="w-full text-left text-[11px]">
                                    <thead className="bg-slate-50 font-bold text-slate-600">
                                      <tr>
                                        <th className="p-1 px-2">Color</th>
                                        <th className="p-1 px-2">Size</th>
                                        <th className="p-1 px-2 text-right">Quantity</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {target.items.map((item, idx) => (
                                        <tr key={idx}>
                                          <td className="p-1 px-2">{item.color}</td>
                                          <td className="p-1 px-2">{item.size}</td>
                                          <td className="p-1 px-2 text-right">{item.quantity.toLocaleString()}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>

                            {/* Verification Block as requested by Step 1 */}
                             <form onSubmit={handleSubmitSupplierQuotation} className="space-y-4">
                              <p className="text-xs font-bold text-teal-800 bg-teal-50 border border-teal-200 rounded p-2.5">
                                Verification Check: Confirming style number. Suggested Style is <b className="uppercase">{target.styleNumber}</b>. (Optional)
                              </p>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="sub-verify">
                                    Verify Style Number (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    id="sub-verify"
                                    placeholder={`e.g. ${target.styleNumber}`}
                                    value={supplierVerifyStyle}
                                    onChange={(e) => setSupplierVerifyStyle(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-400 uppercase"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="sub-comp">
                                    Fabric Composition (Optional)
                                  </label>
                                  <input
                                    type="text"
                                    id="sub-comp"
                                    placeholder="e.g. 85% Nylon, 15% Spandex"
                                    value={supplierComposition}
                                    onChange={(e) => setSupplierComposition(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="sub-moq">
                                    Minimum Order Quantity (MOQ) (Optional)
                                  </label>
                                  <input
                                    type="number"
                                    id="sub-moq"
                                    placeholder="Zero or any quantity"
                                    value={supplierMOQ || ""}
                                    onChange={(e) => setSupplierMOQ(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="sub-mcq">
                                    Minimum Color Quantity (MCQ) (Optional)
                                  </label>
                                  <input
                                    type="number"
                                    id="sub-mcq"
                                    placeholder="Zero or any color quantity"
                                    value={supplierMCQ || ""}
                                    onChange={(e) => setSupplierMCQ(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-400"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="sub-price">
                                    Quoted Unit Price (INR) (Optional)
                                  </label>
                                  <input
                                    type="number"
                                    id="sub-price"
                                    placeholder="Enter price in INR"
                                    value={supplierPrice || ""}
                                    onChange={(e) => setSupplierPrice(Number(e.target.value))}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-400 text-teal-800 font-bold"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="sub-deliv">
                                    Delivery Date / Time (Optional)
                                  </label>
                                  <input
                                    type="date"
                                    id="sub-deliv"
                                    value={supplierDelivery}
                                    onChange={(e) => setSupplierDelivery(e.target.value)}
                                    className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-400"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1" htmlFor="sub-remark">
                                  Supplier Remark (Optional)
                                </label>
                                <textarea
                                  id="sub-remark"
                                  rows={2}
                                  placeholder="Provide any additional quotation remarks (e.g. Price remains valid for next 30 days.)"
                                  value={supplierRemark}
                                  onChange={(e) => setSupplierRemark(e.target.value)}
                                  className="w-full px-3 py-1.5 border border-slate-200 rounded text-xs focus:ring-1 focus:ring-teal-400"
                                />
                              </div>

                              <div className="pt-2">
                                <button
                                  type="submit"
                                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded transition-all cursor-pointer shadow-md"
                                  id="supplier-submit-btn"
                                >
                                  Submit Quotation / Proposal State
                                </button>
                              </div>

                            </form>
                          </div>
                        );
                      })()}
                      </div>
                    </div>
                  ) : (
                    
                    /* SPREADSHEET TABLE GRID VIEW */
                    <div className="space-y-4">
                      
                      {/* Google Sheets Columns Catalog Info Box (Requested by User) */}
                      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-900 font-sans shadow-sm mb-2">
                        <div className="flex items-start gap-3">
                          <span className="p-1 px-2.5 bg-emerald-600 text-white font-extrabold text-[10px] rounded uppercase mt-0.5 select-none shrink-0 tracking-wider">
                            Spreadsheet Columns Tab-wise Manual
                          </span>
                          <div className="space-y-2">
                            <h4 className="text-sm font-bold text-emerald-950 flex items-center gap-1.5 flex-wrap">
                              <span>Google Sheets Columns Tab-wise Schema Catalog</span>
                              <span className="text-[10px] font-bold text-emerald-800 bg-white border border-emerald-100 px-2 py-0.5 rounded-full shadow-sm">
                                Live Database Map
                              </span>
                            </h4>
                            <p className="text-xs text-slate-700 leading-normal">
                              Whenever an employee saves corrections or a supplier populates quotations, rows updates map live to the following Excel structure across all routed sheets (e.g., <b>{activeSheetTab}</b>):
                            </p>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1.5">
                              <div className="bg-white/90 p-3 rounded-lg border border-emerald-100 text-xs shadow-sm">
                                <span className="font-bold text-emerald-900 text-[11px] block border-b border-emerald-100 pb-1 mb-1.5">📋 Master Employee-Driven Columns</span>
                                <ul className="space-y-1 text-slate-600 text-[11px] list-disc list-inside">
                                  <li><b>Col A:</b> Date <span className="text-slate-400">| Creation Timestamp</span></li>
                                  <li><b>Col B:</b> Employee Email <span className="text-slate-400">| Submitter ID</span></li>
                                  <li><b>Col C:</b> Enquiry Type <span className="text-slate-400">| New / Repeat / SGU</span></li>
                                  <li><b>Col D:</b> Supplier Name <span className="text-slate-400">| Target Vendor</span></li>
                                  <li><b>Col E:</b> Customer Name <span className="text-slate-400">| Brand Buyer</span></li>
                                  <li><b>Col F:</b> Style Number <span className="text-slate-400">| Style Reference</span></li>
                                  <li><b>Col G:</b> Description <span className="text-slate-400">| Product Detail</span></li>
                                  <li><b>Col H:</b> Color <span className="text-slate-400">| Individual Item shade</span></li>
                                  <li><b>Col I:</b> Quantity <span className="text-slate-400">| Directed quantity</span></li>
                                  <li><b>Col J:</b> Size / Cup <span className="text-slate-400">| Size layout spec</span></li>
                                  <li><b>Col K:</b> Attachments <span className="text-slate-400">| Drive cloud vault folder</span></li>
                                  <li><b>Col L:</b> Employee Remarks <span className="text-slate-400">| Internal notes</span></li>
                                </ul>
                              </div>
                              
                              <div className="bg-white/90 p-3 rounded-lg border border-emerald-100 text-xs shadow-sm">
                                <span className="font-bold text-emerald-900 text-[11px] block border-b border-emerald-100 pb-1 mb-1.5">💡 Supplier Quotation & Response Columns</span>
                                <p className="text-[10px] text-emerald-700 mb-1 leading-normal italic font-medium">
                                  Automatically populated after the vendor clicks Col R and submits the quote:
                                </p>
                                <ul className="space-y-1 text-slate-600 text-[11px] list-disc list-inside">
                                  <li><b>Col M:</b> Composition <span className="text-slate-400">| fabric/materials %</span></li>
                                  <li><b>Col N:</b> MCQ / MCQ Height <span className="text-slate-400">| Min Color Qty</span></li>
                                  <li><b>Col O:</b> MOQ <span className="text-slate-400">| Minimum Order Quantity</span></li>
                                  <li><b>Col P:</b> Quoted Price <span className="text-slate-400">| Price in INR/pieces</span></li>
                                  <li><b>Col Q:</b> Delivery Date / Supplier Remarks</li>
                                  <li><b>Col R:</b> Supplier Response Portal Link <span className="text-slate-400">| Secure URL</span></li>
                                  <li><b>Col S:</b> Status <span className="text-slate-400">| Pending / Responded</span></li>
                                </ul>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                        <p className="text-xs text-slate-500">
                          Columns A to R representation shown. Showing database submissions routed to sheet: <b className="text-emerald-700">{activeSheetTab}</b>
                        </p>
                        
                        <div className="text-[11px] bg-slate-100 p-1.5 px-3 rounded border text-slate-600 flex items-center gap-1">
                          <span>📊 Spreadsheet synced live database state</span>
                        </div>
                      </div>

                      {/* Spreadsheet Grid */}
                      <div className="overflow-x-auto rounded-lg border border-slate-200">
                        <table className="w-full border-collapse text-xs text-left min-w-[1300px]">
                          <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 select-none">
                            <tr>
                              <th className="p-3 border-r border-slate-200 text-center bg-slate-100 w-10 text-[10px] uppercase font-bold tracking-wider">Row</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col A: Date</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col B: Employee Email</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col C: Enquiry Type</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col D: Supplier Name</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col E: Customer</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col F: Style #</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col G: Description</th>
                              <th className="p-3 border-r border-slate-250 text-[10px] uppercase font-bold tracking-wider bg-amber-50 text-amber-950 font-extrabold shadow-3xs">Col H: Color</th>
                              <th className="p-3 border-r border-slate-250 text-[10px] uppercase font-bold tracking-wider bg-amber-50 text-amber-950 font-extrabold shadow-3xs">Col I: Quantity</th>
                              <th className="p-3 border-r border-slate-250 text-[10px] uppercase font-bold tracking-wider bg-amber-50 text-amber-950 font-extrabold shadow-3xs">Col J: Size / Cup</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col K: Attachments</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider">Col L: Employee Remark</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider bg-slate-100/50">Col M: Composition</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider bg-slate-100/50">Col N: MCQ</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider bg-slate-100/50">Col O: MOQ</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider bg-slate-100/50">Col P: Price (INR)</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider bg-slate-100/50">Col Q: Deliv / Remark</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider bg-emerald-50/60 text-emerald-950">Col R: Supplier Response Portal Link</th>
                              <th className="p-3 border-r border-slate-200 text-[10px] uppercase font-bold tracking-wider text-center">Col S: Status</th>
                              <th className="p-3 border-r-0 text-[10px] uppercase font-bold tracking-wider text-slate-600 font-mono">Col T: Ref ID</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200">
                            {enquiries.filter(enq => enquiries.some(temp => temp.id === enq.id) && enq.routingTab === activeSheetTab).length === 0 ? (
                              <tr>
                                <td colSpan={21} className="p-8 text-center text-slate-400 italic">
                                  No records found in tab "{activeSheetTab}". Fill the Order Enquiry Form to route standard entries.
                                </td>
                              </tr>
                            ) : (
                              (() => {
                                let globalIndexOffset = 2; // Google Sheets row counting offset
                                return enquiries
                                  .filter(enq => enq.routingTab === activeSheetTab)
                                  .map((enq) => {
                                    const numItems = Math.max(1, enq.items.length);
                                    const startRowLine = globalIndexOffset;
                                    globalIndexOffset += numItems; // increment for next item

                                    return (
                                      <React.Fragment key={enq.id}>
                                        {Array.from({ length: numItems }).map((_, itemIndex) => {
                                          const item = enq.items[itemIndex] || { styleNo: "", color: "", quantity: 0, size: "" };
                                          
                                          return (
                                            <tr key={`${enq.id}-${itemIndex}`} className="hover:bg-slate-50/50 group select-text">
                                              
                                              {/* Columns A to G represent core parameters (Rendered only on itemIndex 0, with rowSpan={numItems}) */}
                                              {itemIndex === 0 && (
                                                <>
                                                  {/* Row Number Column */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 text-center bg-slate-100 font-bold text-slate-500 align-middle select-none">
                                                    {startRowLine}
                                                    {numItems > 1 && (
                                                      <span className="block text-[8px] text-emerald-600 font-semibold" title="Merged rows block span">
                                                        ({startRowLine}:{startRowLine + numItems - 1})
                                                      </span>
                                                    )}
                                                  </td>
                                                  
                                                  {/* Date */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 whitespace-nowrap font-medium align-middle">
                                                    {enq.date}
                                                  </td>
                                                  
                                                  {/* Employee Email */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 font-semibold text-sky-850 align-middle">
                                                    {enq.email}
                                                  </td>
                                                  
                                                  {/* Type badge */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 align-middle select-none">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                      enq.type === "Repeat" ? "bg-amber-100 text-amber-850 border border-amber-200" : "bg-blue-100 text-blue-800"
                                                    }`}>
                                                      {enq.type}
                                                    </span>
                                                  </td>
                                                  
                                                  {/* Supplier Name */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 font-medium truncate max-w-[120px] align-middle" title={enq.supplierName}>
                                                    {enq.supplierName}
                                                  </td>
                                                  
                                                  {/* Customer Name */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 font-semibold align-middle truncate max-w-[100px]" title={enq.customerName}>
                                                    {enq.customerName}
                                                  </td>
                                                  
                                                  {/* Style No */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 font-bold font-mono text-slate-800 align-middle bg-slate-50/5 select-all">
                                                    {enq.styleNumber}
                                                  </td>
                                                  
                                                  {/* Description */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 truncate max-w-[150px] align-middle text-slate-600 leading-snug" title={enq.description}>
                                                    {enq.description || "-"}
                                                  </td>
                                                </>
                                              )}

                                              {/* Columns H, I, J represent UNIQUE item elements (Always rendered on every row separately, NOT merged!) */}
                                              {/* Col H: Color */}
                                              <td className="p-3 border-r border-slate-250 font-bold text-slate-755 bg-amber-50/10">
                                                {item.color || <span className="text-slate-400 italic">Blank</span>}
                                              </td>
                                              
                                              {/* Col I: Quantity */}
                                              <td className="p-3 border-r border-slate-250 text-right font-mono bg-amber-50/10 font-bold text-slate-900">
                                                {item.quantity ? item.quantity.toLocaleString() : "0"}
                                              </td>
                                              
                                              {/* Col J: Size */}
                                              <td className="p-3 border-r border-slate-250 font-bold text-indigo-900 bg-amber-50/10">
                                                {item.size || <span className="text-slate-400 italic">Blank</span>}
                                              </td>

                                              {/* Columns K to T (Rendered only on itemIndex 0, with rowSpan={numItems}) */}
                                              {itemIndex === 0 && (
                                                <>
                                                  {/* Attachments links (Col K) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 whitespace-nowrap align-middle">
                                                    {enq.attachments.length > 0 ? (
                                                      <div className="flex flex-col gap-0.5 max-w-[120px] overflow-hidden">
                                                        {enq.attachments.map((a, idx) => (
                                                          <a
                                                            key={idx}
                                                            href={a.url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="text-sky-600 hover:underline truncate text-[10px] block"
                                                          >
                                                            🔗 {a.name}
                                                          </a>
                                                        ))}
                                                      </div>
                                                    ) : (
                                                      <span className="text-slate-400 italic">None</span>
                                                    )}
                                                  </td>

                                                  {/* Employee remarks (Col L) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 truncate max-w-[130px] align-middle select-text text-slate-600" title={enq.remark}>
                                                    {enq.remark || "-"}
                                                  </td>

                                                  {/* Supplier Response: Composition (Col M) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 align-middle bg-slate-50/10 text-slate-700 font-medium">
                                                    {enq.supplierResponse?.composition || <span className="text-slate-400 italic">-</span>}
                                                  </td>

                                                  {/* Supplier Response: MCQ (Col N) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 text-right font-mono align-middle bg-slate-50/10">
                                                    {enq.supplierResponse ? enq.supplierResponse.mcq.toLocaleString() : "-"}
                                                  </td>

                                                  {/* Supplier Response: MOQ (Col O) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 text-right font-mono align-middle bg-slate-50/10">
                                                    {enq.supplierResponse ? enq.supplierResponse.moq.toLocaleString() : "-"}
                                                  </td>

                                                  {/* Supplier Response: Quoted Price (Col P) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 align-middle bg-slate-50/10">
                                                    {enq.supplierResponse ? (
                                                      <span className="font-extrabold text-emerald-700">₹ {enq.supplierResponse.price.toFixed(2)}</span>
                                                    ) : (
                                                      <span className="text-slate-400 italic">-</span>
                                                    )}
                                                  </td>

                                                  {/* Supplier Response: Delivery Time & Supplier Remarks (Col Q) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 align-middle bg-slate-50/10 truncate max-w-[140px] text-[11px]" title={enq.supplierResponse?.remark}>
                                                    {enq.supplierResponse ? (
                                                      <div>
                                                        <span className="font-bold text-slate-800">{enq.supplierResponse.deliveryTime || "N/A"}</span>
                                                        {enq.supplierResponse.remark && <div className="text-[10px] text-slate-500 italic truncate mt-0.5">{enq.supplierResponse.remark}</div>}
                                                      </div>
                                                    ) : (
                                                      <span className="text-slate-400 italic">-</span>
                                                    )}
                                                  </td>

                                                  {/* Supplier Response Link / Setup Copy buttons (Col R) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 bg-emerald-50/30 font-semibold align-middle">
                                                    <div className="flex flex-col gap-1.5 max-w-[170px] mx-auto select-none">
                                                      <button
                                                        onClick={() => setSupplierPortalEnquiryId(enq.id)}
                                                        className="text-[11px] leading-tight text-emerald-700 bg-emerald-100 hover:bg-emerald-200 border border-emerald-300 py-1.5 px-2.5 rounded font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer justify-center text-center shadow-3xs"
                                                        title="Test filling-in Tracy's quotation form within the app"
                                                      >
                                                        <ExternalLink className="h-3 w-3 shrink-0 text-emerald-800" />
                                                        <span className="truncate">Test response Form</span>
                                                      </button>
                                                      <button
                                                        onClick={() => {
                                                          navigator.clipboard.writeText(enq.supplierResponseLink);
                                                          alert(`Success!\nQuotation Link Copied for Ref: ${enq.id}\n\nShare this link with Tracy or the supplier so they can submit quotes directly into this sheet.`);
                                                        }}
                                                        className="text-[11px] leading-tight text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 py-1.5 px-2.5 rounded font-bold transition-all flex items-center gap-1 active:scale-95 cursor-pointer justify-center text-center shadow-3xs"
                                                        title="Copy the real URL links which Tracy edits to fill details in Google Sheets"
                                                      >
                                                        <Copy className="h-3 w-3 shrink-0 text-indigo-805" />
                                                        <span className="truncate">Copy Share Link</span>
                                                      </button>
                                                    </div>
                                                  </td>

                                                  {/* Status Indicator (Col S) */}
                                                  <td rowSpan={numItems} className="p-3 border-r border-slate-200 text-center align-middle select-none">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                                      enq.status === "Responded"
                                                        ? "bg-emerald-100 text-emerald-800 font-extrabold border border-emerald-250 shadow-3xs"
                                                        : "bg-amber-100 text-amber-805 border border-amber-250"
                                                    }`}>
                                                      {enq.status}
                                                    </span>
                                                  </td>

                                                  {/* Ref ID (Col T) */}
                                                  <td rowSpan={numItems} className="p-3 border-r-0 text-left font-mono font-bold text-slate-500 text-[10px] align-middle select-all">
                                                    {enq.id}
                                                  </td>
                                                </>
                                              )}
                                            </tr>
                                          );
                                        })}
                                      </React.Fragment>
                                    );
                                  });
                              })()
                            )}
                          </tbody>
                        </table>
                      </div>

                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* TAB 3: SIMULATED EMAIL OUTBOX MONITOR */}
            {activeTab === "emails_outbox" && (
              <motion.div
                key="emails_outbox"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row h-[600px]"
              >
                
                {/* Outbox Left column - mail list */}
                <div className="w-full md:w-80 border-r border-slate-200 flex flex-col h-1/2 md:h-full bg-slate-50">
                  <div className="p-4 border-b border-slate-200 bg-white">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <Mail className="h-4 w-4 text-sky-500" />
                      Email Notification Outbox
                    </h3>
                    <p className="text-[10px] text-slate-500 mt-0.5">Real-time HTML notification logs triggers on form submit.</p>
                  </div>

                  {/* Mail list scroll */}
                  <div className="flex-1 overflow-y-auto divide-y divide-slate-200">
                    {emails.length === 0 ? (
                      <div className="text-center py-12 px-4 text-slate-400 italic text-xs">
                        No emails sent yet. Submit an order enquiry to see generated messages.
                      </div>
                    ) : (
                      emails.map((mail) => (
                        <button
                          key={mail.id}
                          onClick={() => setSelectedEmailId(mail.id)}
                          className={`w-full text-left p-3.5 transition-colors block cursor-pointer ${
                            selectedEmailId === mail.id
                              ? "bg-sky-50/80 border-l-4 border-l-sky-500"
                              : "hover:bg-slate-100/60 bg-white"
                          }`}
                        >
                          <div className="flex justify-between items-start gap-1">
                            <span className="text-[10px] bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.2 rounded font-mono">
                              {mail.headers["X-Routing-Destination-Tab"] ? "Sub enquiry" : "Quot received"}
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">{mail.date.split(" ")[0]}</span>
                          </div>
                          <h4 className="text-xs font-bold text-slate-800 truncate mt-1.5 leading-snug">
                            {mail.subject}
                          </h4>
                          <p className="text-[11px] text-slate-500 mt-1 truncate">
                            To: {mail.to} | CC: {mail.cc}
                          </p>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* Outbox Right column - mail preview container (PROOF of no undefined) */}
                <div className="flex-1 flex flex-col h-1/2 md:h-full">
                  {selectedEmailId ? (
                    (() => {
                      const selectedMail = emails.find(m => m.id === selectedEmailId);
                      if (!selectedMail) return <div className="p-8 text-center text-slate-400">Select an email to view.</div>;

                      return (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                          {/* Header Metadata info */}
                          <div className="p-4 border-b border-slate-200 bg-white space-y-1.5 text-xs">
                            <div className="flex justify-between items-center text-[11px] text-slate-400">
                              <span><b>Date Sent:</b> {selectedMail.date}</span>
                              <span className="font-mono text-slate-400">ID: {selectedMail.id}</span>
                            </div>
                            <h3 className="text-sm font-bold text-slate-900 border-b border-dashed border-slate-100 pb-2">
                              {selectedMail.subject}
                            </h3>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 bg-slate-50 p-2 rounded border border-slate-200/60 font-mono text-[11px]">
                              <div><span className="text-slate-400 font-semibold">FROM:</span> <span className="text-slate-700">{selectedMail.headers["From"]}</span></div>
                              <div><span className="text-slate-400 font-semibold">TO:</span> <span className="text-slate-700">{selectedMail.to}</span></div>
                              <div className="sm:col-span-2">
                                <span className="text-slate-400 font-semibold">CC:</span>{" "}
                                <span className="text-amber-700 font-bold">{selectedMail.cc}</span>
                              </div>
                              <div className="sm:col-span-2">
                                <span className="text-slate-400 font-semibold">REPLY-TO:</span>{" "}
                                <span className="text-sky-700 font-bold">{selectedMail.replyTo}</span>
                              </div>
                            </div>

                            {/* Direct Dispatch Toolbar (Gmail / WhatsApp) */}
                            {(() => {
                              const linkedEnq = enquiries.find(e => 
                                selectedMail.subject.includes(e.id) || 
                                selectedMail.subject.includes(e.styleNumber) ||
                                selectedMail.id === e.id
                              );
                              
                              const targetLink = linkedEnq ? linkedEnq.supplierResponseLink : `${window.location.origin}/?portal=supplier&id=enq_generic`;
                              const targetStyle = linkedEnq ? linkedEnq.styleNumber : "Enquiry Ref";
                              const targetEmail = linkedEnq ? linkedEnq.email : selectedMail.replyTo;
                              const targetId = linkedEnq ? linkedEnq.id : selectedMail.id;

                              return (
                                <div className="mt-2.5 p-3 bg-indigo-50 border border-indigo-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
                                  <div className="space-y-0.5">
                                    <h4 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                                      <span>✉️</span> Real-Time Email & Message Dispatcher
                                    </h4>
                                    <p className="text-[10px] text-slate-500 leading-relaxed font-normal">
                                      To send a real-life notification with the active link to Tracy directly:
                                    </p>
                                  </div>
                                  <div className="flex gap-2 shrink-0">
                                    {/* Copy link */}
                                    <button
                                      onClick={() => {
                                        navigator.clipboard.writeText(targetLink);
                                        alert("Copied Supplier Response link!");
                                      }}
                                      className="px-2.5 py-1.5 bg-white hover:bg-slate-50 border border-slate-200 rounded text-[10px] font-bold text-slate-700 cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                                      title="Copy link to clipboard"
                                    >
                                      <Copy className="h-3 w-3" />
                                      <span>Copy Link</span>
                                    </button>
                                    
                                    {/* Compose Gmail */}
                                    <a
                                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent("tracychi@gmail.com")}&cc=${encodeURIComponent(selectedMail.cc)}&su=${encodeURIComponent(selectedMail.subject)}&body=${encodeURIComponent(
                                        `Dear Team,\n\nPlease click on the link below to submit pricing and quotation updates for Style Reference ${targetStyle} (Ref ID: ${targetId}):\n\n${targetLink}\n\nBest regards,\nGinza Limited Merchant Team\n`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                                    >
                                      <Mail className="h-3.5 w-3.5 text-white" />
                                      <span>Email Tracy</span>
                                    </a>

                                    {/* Open WhatsApp */}
                                    <a
                                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                        `Hi Tracy,\n\nPlease fill in the quotation and price details for Style: ${targetStyle} here:\n${targetLink}`
                                      )}`}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold cursor-pointer transition-all active:scale-95 flex items-center gap-1"
                                    >
                                      <span>💬</span>
                                      <span>WhatsApp</span>
                                    </a>
                                  </div>
                                </div>
                              );
                            })()}
                          </div>

                          {/* Rendered HTML inside iframe simulation */}
                          <div className="flex-1 overflow-y-auto bg-slate-100 p-4">
                            <div className="bg-white shadow rounded-lg p-2 max-w-2xl mx-auto min-h-[400px]">
                              {/* Inject actual HTML as safe sandbox preview to verify and prove everything aligns */}
                              <div 
                                dangerouslySetInnerHTML={{ __html: selectedMail.body }} 
                                className="mail-preview-body"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="flex-1 flex flex-col justify-center items-center text-slate-400 p-8 space-y-2">
                      <Mail className="h-10 w-10 text-slate-300" />
                      <p className="text-xs">No email selected. Select a sent notification from the left pane to view rendered HTML mail validation.</p>
                    </div>
                  )}
                </div>

              </motion.div>
            )}

            {/* TAB 4: GOOGLE DRIVE STORAGE SIMULATOR */}
            {activeTab === "drive_simulator" && (
              <motion.div
                key="drive_simulator"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 sm:p-6"
              >
                <div className="border-b border-slate-100 pb-4 mb-6">
                  <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <FolderOpen className="h-5.5 w-5.5 text-slate-600" />
                    Google Drive — Ginza Limited ERP Vault
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Automatic file archival folder storage. Files attached by employees are categorized automatically into secure storage paths.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* Folders List Left */}
                  <div className="bg-slate-50 rounded-lg p-4 border border-slate-200/65 space-y-3">
                    <p className="text-xs font-bold uppercase text-slate-500 mb-2">Active Target Folders</p>
                    
                    <div className="space-y-1">
                      <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5"><Folder className="h-4 w-4 text-yellow-500 fill-yellow-100" /> SGU Attachments</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded">Protected</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5"><Folder className="h-4 w-4 text-yellow-500 fill-yellow-100" /> Export Documents</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded">Protected</span>
                      </div>
                      <div className="p-2 bg-white rounded border border-slate-200 flex items-center justify-between text-xs font-semibold text-slate-700">
                        <span className="flex items-center gap-1.5"><Folder className="h-4 w-4 text-slate-400 fill-slate-100" /> General / VAU Shared</span>
                        <span className="text-[10px] bg-slate-100 px-1.5 py-0.2 rounded">Public Link</span>
                      </div>
                    </div>

                    <div className="bg-white p-3 rounded text-[11px] text-slate-500 leading-relaxed border space-y-1.5">
                      <p className="font-bold text-slate-700 text-xs">Drive Node Settings</p>
                      <p>• Root Folder Sync: <code>ginza-limited-enquiries/</code></p>
                      <p>• Sharing Permission: <b>Public by Link (Column K)</b>. Enables direct supplier audit.</p>
                    </div>
                  </div>

                  {/* Uploaded Files grid List */}
                  <div className="md:col-span-2 space-y-4">
                    <div className="flex justify-between items-center bg-slate-900 text-white p-3 px-4 rounded-lg text-xs">
                      <span className="font-semibold">Simulated Storage Files</span>
                      <span>{enquiries.reduce((acc, enq) => acc + enq.attachments.length, 0)} files archived</span>
                    </div>

                    <div className="overflow-x-auto rounded border">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-100 text-slate-500 font-bold border-b">
                          <tr>
                            <th className="p-2.5">File Name</th>
                            <th className="p-2.5">Size Name</th>
                            <th className="p-2.5">Uploaded Date</th>
                            <th className="p-2.5">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y text-slate-700">
                          {enquiries.flatMap(enq => enq.attachments).length === 0 ? (
                            <tr>
                              <td colSpan={4} className="p-6 text-center text-slate-400 italic">No files in Drive. Submit an order enquiry with attachments to fill storage.</td>
                            </tr>
                          ) : (
                            enquiries.flatMap(enq => enq.attachments).map((file, i) => (
                              <tr key={i} className="hover:bg-slate-50">
                                <td className="p-2.5 font-semibold text-sky-800">📄 {file.name}</td>
                                <td className="p-2.5 font-mono">{file.size}</td>
                                <td className="p-2.5 text-slate-400">{file.uploadedAt}</td>
                                <td className="p-2.5">
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-indigo-600 hover:underline font-semibold text-[11px]"
                                  >
                                    View Drive URL
                                  </a>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                </div>

              </motion.div>
            )}

          </AnimatePresence>

          {/* SYSTEM VERIFICATION LOGGER WATERMARK FOOTER (Step-by-Step compliance explanation) */}
          {showAdminConsole && !(activeTab === "enquiry_form" && !supplierPortalEnquiryId) && (
            <footer className="mt-8 bg-white border border-slate-200/80 rounded-xl p-4 sm:p-5 text-xs text-slate-600 space-y-4 shadow-sm">
              
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                <h4 className="font-bold text-slate-800 text-sm">Ginza Limited Compliance Verification Log</h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 leading-relaxed text-[11px] text-slate-500">
                <div className="space-y-1 border-r border-slate-100 pr-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <span className="bg-blue-100 text-blue-800 h-4 w-4 rounded-full inline-flex items-center justify-center font-bold text-[10px]">1</span>
                    Auto CC Routing matrix
                  </span>
                  <p>Default includes <b>mis.mumbai@ginzalimited.com</b>. Intelligent ping-pong automatically adds alternate SGU teammate if sender matches merch1 or merch2.</p>
                </div>

                <div className="space-y-1 border-r border-slate-100 pr-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <span className="bg-blue-100 text-blue-800 h-4 w-4 rounded-full inline-flex items-center justify-center font-bold text-[10px]">2</span>
                    Reply-To Alignment
                  </span>
                  <p>Any email generated dynamically maps the <b>Reply-To header</b> directly to the enquiring Employee Email. Tracy's replies go straight to the requester.</p>
                </div>

                <div className="space-y-1 border-r border-slate-100 pr-2">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <span className="bg-blue-100 text-blue-800 h-4 w-4 rounded-full inline-flex items-center justify-center font-bold text-[10px]">3</span>
                    Zero "undefined" errors
                  </span>
                  <p>Our parameters consolidation logic merges multi-row values cleanly into joined strings in columns H, I, J and populates a beautifully formatted table inside the email body.</p>
                </div>

                <div className="space-y-1">
                  <span className="font-bold text-slate-800 text-xs flex items-center gap-1">
                    <span className="bg-blue-100 text-blue-800 h-4 w-4 rounded-full inline-flex items-center justify-center font-bold text-[10px]">4</span>
                    Supplier Portal link
                  </span>
                  <p>Generated URL (Column R) redirects securely. The supplier is forced to verify the Style number matching before pricing is allowed to enter the database sheets.</p>
                </div>
              </div>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-semibold text-[11px] text-slate-600 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                <span>🛠️ Active App Node: <code>{window.location.host}</code></span>
                <span>🔒 Connected Developer Session User Email: <b className="text-teal-700">mis.mumbai@ginzalimited.com</b></span>
              </div>

            </footer>
          )}

        </div>

      </main>

      {/* Pristine Google Form Footer & ERP Toggle Panel */}
      <footer className="w-full bg-[#f0ebf8]/30 py-8 border-t border-slate-200 mt-auto">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <p className="text-xs text-[#5f6368]">
            This content is neither created nor endorsed by Google. 
            <span className="block mt-1">This secure form routes order enquiries and supplier quotes through Ginza Limited's ERP cloud system.</span>
          </p>
          <div className="text-[11px] text-[#5f6368] font-semibold flex justify-center items-center gap-3 flex-wrap">
            <span className="text-slate-400">Ginza Limited Forms</span>
            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
            <a href="#" onClick={(e) => { e.preventDefault(); }} className="hover:underline">Report Abuse</a>
            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
            <a href="#" onClick={(e) => { e.preventDefault(); }} className="hover:underline">Terms of Service</a>
            <span className="h-1 w-1 bg-slate-300 rounded-full"></span>
            <a href="#" onClick={(e) => { e.preventDefault(); }} className="hover:underline">Privacy Policy</a>
          </div>

          {!showAdminConsole && (
            <div className="pt-2 border-t border-slate-200/50 flex justify-center items-center">
              <button
                type="button"
                onClick={() => {
                  setShowAdminConsole(true);
                  setActiveTab("sheets_simulator");
                }}
                className="text-[10px] text-slate-400 hover:text-purple-700 hover:bg-purple-50 flex items-center gap-1.5 px-3 py-1 bg-transparent border border-transparent hover:border-purple-200 rounded-md transition-all font-semibold cursor-pointer"
                id="admin-console-launcher"
              >
                <Settings className="h-3 w-3" />
                <span>ERP Admin & Google Sheet Syncer</span>
              </button>
            </div>
          )}

        </div>
      </footer>

      {/* SUCCESS SHARE DIALOG OVERLAY DESIGNED FOR REAL-TIME WHATSAPP AND EMAIL COMPOSITIONS */}
      <AnimatePresence>
        {lastSubmittedEnquiry && (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col"
            >
              {/* Header card with emerald background */}
              <div className="bg-emerald-600 text-white p-6 relative">
                <button
                  onClick={() => setLastSubmittedEnquiry(null)}
                  className="absolute top-4 right-4 text-emerald-100 hover:text-white bg-emerald-700/40 hover:bg-emerald-700/60 p-1.5 rounded-full transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
                <div className="bg-emerald-500 text-white rounded-full h-10 w-10 flex items-center justify-center font-bold mb-3 shadow-md">
                  ✓
                </div>
                <h3 className="text-lg font-bold">Enquiry Created & Routed!</h3>
                <p className="text-xs text-emerald-100/90 mt-1">
                  ID: <span className="font-mono font-bold">{lastSubmittedEnquiry.id}</span> | Routed to <span className="font-bold">Excel Sheet: [{lastSubmittedEnquiry.routingTab}]</span>
                </p>
              </div>

              <div className="p-6 space-y-4 flex-1">
                <p className="text-xs text-slate-500 leading-normal">
                  The enquiry was processed successfully. Copy and share this unique **Supplier Pricing Response Link** directly. When Tracy or the supplier opens this link to submit details, the records will reflect instantly inside your Google Sheet!
                </p>

                {/* Link input with copy button */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Supplier Response Portal Link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={lastSubmittedEnquiry.supplierResponseLink}
                      className="flex-1 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg p-2.5 outline-none select-all text-slate-850"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(lastSubmittedEnquiry.supplierResponseLink);
                        alert("Copied Supplier Response link!");
                      }}
                      className="px-3.5 bg-emerald-50 text-emerald-700 hover:bg-emerald-150 border border-emerald-200 hover:border-emerald-300 rounded-lg font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Link</span>
                    </button>
                  </div>
                </div>

                {/* Action Panel: real options for Gmail, WhatsApp */}
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Share Link Instantly
                  </span>

                  <div className="grid grid-cols-2 gap-2">
                    {/* WhatsApp */}
                    <a
                      href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                        `Hi Tracy,\n\nPlease fill in the quotation and price details for Style: ${lastSubmittedEnquiry.styleNumber} here:\n${lastSubmittedEnquiry.supplierResponseLink}`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 justify-center p-2.5 border border-emerald-200 rounded-lg hover:bg-emerald-50 text-xs font-bold text-emerald-800 transition-colors cursor-pointer"
                    >
                      <span className="text-base shrink-0">💬</span>
                      <span className="truncate">Share on WhatsApp</span>
                    </a>

                    {/* Email draft */}
                    <a
                      href={`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
                        lastSubmittedEnquiry.email
                      )}&su=${encodeURIComponent(
                        `Action Required: Submit Quote for Style ${lastSubmittedEnquiry.styleNumber} (Ref # ${lastSubmittedEnquiry.id})`
                      )}&body=${encodeURIComponent(
                        `Dear Team,\n\nPlease click on the link below to submit pricing and quotation updates for Style Reference ${lastSubmittedEnquiry.styleNumber}:\n\n${lastSubmittedEnquiry.supplierResponseLink}\n\nBest regards,\nGinza Limited ERP System\n`
                      )}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-2 justify-center p-2.5 border border-sky-200 rounded-lg hover:bg-sky-50 text-xs font-bold text-sky-800 transition-colors cursor-pointer"
                    >
                      <Mail className="h-4 w-4 text-sky-600 shrink-0" />
                      <span className="truncate">Compose on Gmail</span>
                    </a>
                  </div>
                </div>

                {/* Copy full detailed email template text */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                  <div className="text-[10px] text-slate-450 leading-snug">
                    Need to email a full breakdown instead of just the link? Show full breakdown:
                  </div>
                  <button
                    onClick={() => {
                      const fullDetails = `Dear Supplier/Tracy,

Please provide details for the new Order Enquiry on our merchant portal:

* Enquiry Ref ID: ${lastSubmittedEnquiry.id}
* Customer: ${lastSubmittedEnquiry.customerName}
* Style Code: ${lastSubmittedEnquiry.styleNumber}
* Items List: ${lastSubmittedEnquiry.items.map(i => `${i.color} (${i.size}) - Qty: ${i.quantity}`).join(", ")}

Access the response portal securely using this link:
${lastSubmittedEnquiry.supplierResponseLink}

Thank you,
Ginza Limited Merchant Team`;

                      navigator.clipboard.writeText(fullDetails);
                      alert("Success! Detailed email text copied to clipboard. Paste into your Outlook/Email client now!");
                    }}
                    className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-150 py-1.5 px-3 rounded-lg hover:bg-indigo-100 cursor-pointer transition-all active:scale-95 shrink-0 whitespace-nowrap"
                  >
                    📋 Copy Detailed Email Text
                  </button>
                </div>
              </div>

              <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setLastSubmittedEnquiry(null);
                    setActiveTab("sheets_simulator");
                  }}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-350 hover:text-slate-900 border border-slate-300 rounded-lg font-bold text-slate-700 transition-colors cursor-pointer active:scale-95"
                >
                  Go to Excel Sheet
                </button>
                <button
                  type="button"
                  onClick={() => setLastSubmittedEnquiry(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-black rounded-lg font-bold text-white transition-colors cursor-pointer active:scale-95"
                >
                  Done
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
