import api from "./axios";

export const getExpenses = ({ status, page = 1, limit = 20, search = "" } = {}) => {
  const params = { page, limit };
  if (status && status !== "all") params.status = status;
  if (search) params.search = search;
  
  return api.get("/expenses", { params });
};

export const getExpenseById = (id) => api.get(`/expenses/${id}`);

export const createExpense = (payload) => {
  return api.post("/expenses/create-expense", payload);
};

export const updateExpense = (id, payload) => api.put(`/expenses/${id}`, payload);

export const deleteExpense = (id) => api.delete(`/expenses/${id}`);

export const submitExpense = (id) => api.put(`/expenses/${id}/submit`);

export const approveExpense = (id, decison) =>
  api.put(`/expenses/${id}/approvals`, decison);