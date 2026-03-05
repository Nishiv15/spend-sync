import mongoose from "mongoose";
import ExpenseRequest from "../models/ExpenseRequest.js";
import Approval from "../models/Approval.js";
import User from "../models/User.js";
import Role from "../models/Role.js";
import Company from "../models/Company.js";

const createExpense = async (req, res) => {
  try {
    const requester = req.user;
    const companyId = requester.company;
    if (!companyId) return res.status(400).json({ message: "Requester not associated with a company" });

    const { title, items = [], totalAmount, department, attachments = [], status } = req.body;

    if (!title || totalAmount === undefined) {
      return res.status(400).json({ message: "title and totalAmount are required" });
    }

    // Create expense in 'draft' or 'submitted' depending on client; default draft
    const expense = await ExpenseRequest.create({
      company: companyId,
      createdBy: requester._id,
      title,
      items,
      totalAmount,
      department,
      attachments,
      status
    });

    return res.status(201).json({ message: "Expense created", expense });
  } catch (error) {
    console.error("createExpense error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const getExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const companyId = req.user.company;
    const requesterId = req.user._id.toString();

    const expense = await ExpenseRequest.findById(expenseId)
      .populate("createdBy", "name email userType")
      .populate({
        path: "status",
        populate: { path: "approver", select: "name email userType" }
      })
      .lean();

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Company-level access check
    if (expense.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // 🔐 DRAFT restriction
    if (
      expense.status === "draft" &&
      expense.createdBy._id.toString() !== requesterId
    ) {
      return res.status(403).json({
        message: "Draft expenses can only be viewed by the creator"
      });
    }

    return res.json({ expense });
  } catch (error) {
    console.error("getExpense error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const listExpenses = async (req, res) => {
  try {
    const companyId = req.user.company;
    const userId = req.user._id;
    const { status = "all", page = 1, limit = 20, search = "" } = req.query;

    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    if (!companyId) {
      return res.status(400).json({ message: "User not associated with a company" });
    }

    let baseFilter = { company: companyId };

    if (status === "draft") {
      // Only own drafts
      baseFilter.status = "draft";
      baseFilter.createdBy = userId;
    } else if (["submitted", "approved", "rejected"].includes(status)) {
      // Company-wide visible statuses
      baseFilter.status = status;
    } else {
      // status === "all"
      baseFilter.$or = [
        { status: { $ne: "draft" } },
        { status: "draft", createdBy: userId }
      ];
    }

    let finalFilter = baseFilter;

    if (search.trim()) {
      const escapedSearch = search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      finalFilter = {
        $and: [
          baseFilter,
          { title: { $regex: escapedSearch, $options: "i" } }
        ]
      };
    }

    // Use finalFilter for the queries
    const total = await ExpenseRequest.countDocuments(finalFilter);

    const expenses = await ExpenseRequest.find(finalFilter)
      .populate("createdBy", "name email userType")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)
      .lean();

    return res.json({
      page: pageNumber,
      totalPages: Math.max(1, Math.ceil(total / limitNumber)),
      totalItems: total,
      count: expenses.length,
      expenses,
    });

  } catch (error) {
    console.error("listExpenses error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const userId = req.user._id;
    const companyId = req.user.company;

    const {
      title,
      items,
      totalAmount,
      department,
      attachments
    } = req.body;

    const expense = await ExpenseRequest.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Ensure same company
    if (expense.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only creator can edit
    if (expense.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the creator can edit this expense"
      });
    }

    // Only editable in draft state
    if (expense.status !== "draft") {
      return res.status(400).json({
        message: "Expense can only be edited while in draft state"
      });
    }

    // ===== UPDATE ALLOWED FIELDS ONLY =====
    if (title !== undefined) expense.title = title;
    if (items !== undefined) expense.items = items;
    if (totalAmount !== undefined) expense.totalAmount = totalAmount;
    if (department !== undefined) expense.department = department;
    if (attachments !== undefined) expense.attachments = attachments;
    // =====================================

    await expense.save();

    return res.json({
      message: "Expense updated successfully",
      expense
    });

  } catch (error) {
    console.error("updateExpense error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const deleteExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const userId = req.user._id;
    const companyId = req.user.company;

    const expense = await ExpenseRequest.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Company ownership check
    if (expense.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Creator-only delete
    if (expense.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the creator can delete this expense"
      });
    }

    // Draft-only delete
    if (expense.status !== "draft") {
      return res.status(400).json({
        message: "Only draft expenses can be deleted"
      });
    }

    // Hard delete
    await ExpenseRequest.deleteOne({ _id: expense._id });

    return res.json({
      message: "Draft expense deleted successfully",
      expenseId
    });

  } catch (error) {
    console.error("deleteExpense error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const submitExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const userId = req.user._id;
    const companyId = req.user.company;

    const expense = await ExpenseRequest.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Company ownership check
    if (expense.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Creator-only submit
    if (expense.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({
        message: "Only the creator can submit this expense"
      });
    }

    // Draft-only submit
    if (expense.status !== "draft") {
      return res.status(400).json({
        message: "Only draft expenses can be submitted"
      });
    }

    // Change status to submitted
    expense.status = "submitted";
    expense.submittedAt = new Date();

    await expense.save();

    return res.json({
      message: "Expense submitted successfully",
      expense
    });

  } catch (error) {
    console.error("submitExpense error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

const approveExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;
    const { decision, comment } = req.body;

    const userId = req.user._id;
    const companyId = req.user.company;
    const userType = req.user.userType;

    // Manager-only
    if (userType !== "manager") {
      return res.status(403).json({
        message: "Only managers can approve or reject expenses"
      });
    }

    if (!["approved", "rejected"].includes(decision)) {
      return res.status(400).json({
        message: "Decision must be either 'approved' or 'rejected'"
      });
    }

    const expense = await ExpenseRequest.findById(expenseId);

    if (!expense) {
      return res.status(404).json({ message: "Expense not found" });
    }

    // Company check
    if (expense.company.toString() !== companyId.toString()) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Must be submitted
    if (expense.status !== "submitted") {
      return res.status(400).json({
        message: "Only submitted expenses can be approved or rejected"
      });
    }

    // Creator cannot approve own expense
    if (expense.createdBy.toString() === userId.toString()) {
      return res.status(403).json({
        message: "You cannot approve or reject your own expense"
      });
    }

    const approval = await Approval.create({
      expense: expense._id,
      approver: userId,
      decision,
      comment: comment || ""
    });

    // Update expense status
    expense.status = decision;
    expense.reviewedBy = userId;
    expense.reviewedAt = new Date();
    expense.approvals.push(approval._id);

    await expense.save();

    return res.json({
      message: `Expense ${decision} successfully`,
      expense
    });

  } catch (error) {
    console.error("approveExpense error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

export {createExpense, getExpense, listExpenses, updateExpense, deleteExpense, submitExpense, approveExpense};