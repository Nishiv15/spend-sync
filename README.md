# SpendSync

## Website URL

Website Link: https://spend-sync-57a5.vercel.app/

## 📌 Overview

**SpendSync** is a modern, web-based platform designed to simplify and streamline **company expense management and approval workflows**.  
It helps organizations manage employee expenses, approvals, and budget control in a **centralized, transparent, and secure** way.

The system is built using the **MERN stack** and focuses on solving real-world problems faced by companies when handling expense reimbursements and approvals.

---

## 🎯 Problem

In many organizations, expense management is still handled through:
- Endless email chains
- Cluttered spreadsheets
- Manual, untraceable approvals
- Paper receipts

This leads to:
- Lack of transparency
- Delayed approvals
- Poor tracking
- No clear audit trail
- Difficulty managing approvals across teams

---

## 💡 Solution

SpendSync provides a **structured, role-based platform** where:

- Employees can submit expenses easily and track their status in real-time.
- Managers can review, approve, or reject expenses with a single click.
- All actions are tracked and fully auditable.
- The expense lifecycle is clearly defined from draft to resolution.
- Company data is securely isolated, and password recovery is handled via OTP.

---

## 👥 User Roles

### 🔹 Manager
- Creates and manages the company account
- Registers employees and assigns roles
- Reviews, approves, or rejects expenses
- Accesses comprehensive dashboard analytics and real-time statistics
- Manages users (including secure soft deletion)
- Can deactivate the company

### 🔹 Employee
- Logs in using credentials securely provisioned by the manager
- Creates and manages expense requests
- Utilizes the "Draft" feature to edit or delete expenses before final submission
- Submits expenses for official approval
- Views personal expense status, history, and analytics
- Updates profile and manages password settings

---

## 🔁 Expense Lifecycle

Draft → Submitted → Approved / Rejected

- **Draft**
  - Editable and deletable
  - Visible only to the creator

- **Submitted**
  - Locked from editing
  - Sent instantly to the manager for review

- **Approved / Rejected**
  - Final resolved state
  - Stored permanently for clear financial auditing

---

## 🔐 Security & Access Control

- Role-based access control (Manager / Employee)
- Strict company-level data isolation
- Draft expenses visible only to their creators
- Soft deletion for users and companies to prevent accidental data loss
- Backend-enforced authorization rules and JWT-based authentication
- Strict "No Self-Approval" policy enforced at the API level
- OTP-based password reset via email

---

## 🧱 Technology Stack

### Backend
- Node.js & Express.js
- MongoDB & Mongoose
- JWT Authentication
- Resend API (for OTP email verification)

### Frontend
- React.js (Vite)
- Tailwind CSS (Fully responsive UI)
- JavaScript
- Axios
- Zustand (State management)
- Lucide React (Iconography)

---

## 🗂️ Key Features

- **Modern Landing Page:** Attractive, responsive entry point explaining the product workflow.
- **Multi-Tenant Architecture:** Company-based multi-user system.
- **Advanced Filtering & Search:** Real-time search by title, and filtering by status, department, and date ranges.
- **Optimized Pagination:** Fast data loading and smooth table navigation.
- **Approval Workflow:** Clear status tracking and history logs.
- **Dashboard Analytics:** Visual breakdown of expense statuses and recent activities.
- **URL-Based Attachments:** Easy linking for digital receipts.
- **Soft Deletion:** Data safety for users and organizational records.