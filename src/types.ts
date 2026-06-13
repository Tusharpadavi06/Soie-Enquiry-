export interface EnquiryItem {
  styleNo: string;
  color: string;
  quantity: number;
  size: string;
}

export interface Attachment {
  name: string;
  url: string;
  size: string;
  uploadedAt: string;
}

export interface SupplierResponse {
  composition: string;
  moq: number;
  mcq: number;
  price: number;
  deliveryTime: string;
  remark: string;
  respondedAt: string;
}

export interface Enquiry {
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

export interface EmailLog {
  id: string;
  subject: string;
  to: string;
  cc: string;
  replyTo: string;
  body: string;
  date: string;
  headers: Record<string, string>;
}
