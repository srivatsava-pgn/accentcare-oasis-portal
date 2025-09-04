import { API } from "./apiService";

// Token management
export const setApiToken = (token) => {
  localStorage.setItem("auth_token", token);
};

export const getApiToken = () => {
  return localStorage.getItem("auth_token") || sessionStorage.getItem("token");
};

// Dashboard Service Methods
export const getOasisProjects = async (pageNum, entriesPerPage, status) => {
  try {
    const response = await API.get(
      `/oasis-scrubbing/oasis-projects?page_num=${pageNum}&entries_per_page=${entriesPerPage}&status=${status}`
    );
    return response.data;
  } catch (error) {
    console.error("GET /oasis-scrubbing/oasis-projects failed:", error);
    throw error;
  }
};

// Search Oasis projects by episode ID
export const searchOasisProjects = async (episodeId) => {
  try {
    const response = await API.get(
      `/oasis-scrubbing/search-oasis-projects?episode_id=${episodeId}`
    );
    return response.data.projects;
  } catch (error) {
    console.error("Error searching projects:", error);
    throw error;
  }
};

// New API function for dashboard stats
export const getDashboardStats = async () => {
  try {
    const response = await API.get(`/oasis-scrubbing/dashboard-stats`);
    return response.data;
  } catch (error) {
    console.error("GET /oasis-scrubbing/dashboard-stats failed:", error);
    throw error;
  }
};

export const getDocumentByMrn = async (mrn) => {
  try {
    const response = await API.get(`/oasis-scrubbing/files/${mrn}`);
    return response.data;
  } catch (error) {
    console.error(`GET /oasis-scrubbing/files/${mrn} failed:`, error);
    throw error;
  }
};

export const getOasisResultsByMrn = async (mrn) => {
  try {
    const response = await API.get(`/oasis-scrubbing/oasis-results/${mrn}`);
    return response.data;
  } catch (error) {
    console.error(`GET /oasis-scrubbing/oasis-results/${mrn} failed:`, error);
    throw error;
  }
};

// Search document by MRN and search string
export const searchDocumentByMrn = async (mrn, searchString) => {
  try {
    const response = await API.post(`/oasis-scrubbing/search_document/${mrn}`, {
      search_string: searchString,
    });
    return response.data;
  } catch (error) {
    console.error(
      `POST /oasis-scrubbing/search_document/${mrn} failed:`,
      error
    );
    throw error;
  }
};

// Authentication method
export const loginUser = async (username, password) => {
  try {
    const response = await API.post("/oasis-scrubbing/login", {
      username: username.trim(),
      password: password.trim(),
    });

    const data = response.data;

    if (data.access_token) {
      setApiToken(data.access_token);
    }

    return data;
  } catch (error) {
    console.error("POST /oasis-scrubbing/login failed:", error);
    throw error;
  }
};

export const updateGuidelineDecision = async (mrn, guidelineId, action) => {
  try {
    const response = await API.post("/oasis-scrubbing/guideline-decision", {
      mrn: mrn,
      guideline_id: guidelineId,
      action: action, // "accept", "reject", or "undo"
    });
    return response.data;
  } catch (error) {
    console.error(`POST /guideline-decision failed:`, error);
    throw error;
  }
};

export const submitGuidelineRejectionNote = async (rejectionData) => {
  try {
    const response = await API.post(
      "/oasis-scrubbing/guideline-rejection-note",
      rejectionData
    );
    return response.data;
  } catch (error) {
    console.error(
      "POST /oasis-scrubbing/guideline-rejection-note failed:",
      error
    );
    throw error;
  }
};
