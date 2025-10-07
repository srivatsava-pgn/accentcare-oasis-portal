import { API } from "./apiService";
import type { 
  DashboardStats, 
  OasisProject, 
  PaginationInfo, 
  DocumentData, 
  OasisParentGuideline,
  OasisChildGuideline,
  OasisChildGuideline,
  EpisodeStatus 
} from "../types";

// Token management
export const setApiToken = (token: string) => {
  localStorage.setItem("auth_token", token);
};

export const getApiToken = () => {
  return localStorage.getItem("auth_token") || sessionStorage.getItem("token");
};

// Status normalization utilities
export const normalizeStatus = (status: string): string => {
  return status.toLowerCase().replace(/\s+/g, '_');
};

export const getStatusLabel = (status: string): string => {
  const map: Record<string, string> = {
    'started': 'Started',
    'processing': 'Processing...',
    'completed': 'Ready for Review',
    'in_review': 'In Review',
    'reviewed': 'Reviewed & Locked',
    'failed': 'Failed'
  };
  
  const normalizedStatus = normalizeStatus(status);
  return map[normalizedStatus] || status;
};

// URL caching for presigned URLs (expire after 1 hour)
const urlCache = new Map<string, { url: string; timestamp: number }>();

export const getCachedDocumentUrl = (episodeId: string, documentName: string, pageNum: string = '1'): string | null => {
  const cacheKey = `${episodeId}_${documentName}_${pageNum}`;
  const cached = urlCache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 3600000) { // 1 hour = 3600000ms
    return cached.url;
  }
  
  return null;
};

export const setCachedDocumentUrl = (episodeId: string, documentName: string, pageNum: string, url: string) => {
  const cacheKey = `${episodeId}_${documentName}_${pageNum}`;
  urlCache.set(cacheKey, {
    url,
    timestamp: Date.now()
  });
};

// Dashboard Service Methods
export const fetchOasisProjects = async (
  pageNum: number = 1, 
  entriesPerPage: number = 10, 
  status: string = 'ALL'
): Promise<{ projects: OasisProject[]; pagination: PaginationInfo }> => {
  try {
    const response = await API.get(
      `/oasis-projects?page_num=${pageNum}&entries_per_page=${entriesPerPage}&status=${status}`
    );
    return response.data;
  } catch (error) {
    console.error("GET /oasis-projects failed:", error);
    // Fallback data to prevent UI crashes
    return {
      projects: [],
      pagination: {
        total_pages: 1,
        total_count: 0,
        has_prev: false,
        has_next: false
      }
    };
  }
};

// Search episodes by episode ID
export const searchEpisodeProjects = async (episodeId: string): Promise<OasisProject[]> => {
  try {
    const response = await API.get(`/search-oasis-projects?episode_id=${episodeId}`);
    return response.data.projects || [];
  } catch (error) {
    console.error("Error searching episodes:", error);
    return []; // Fallback to empty array
  }
};

// Get dashboard statistics
export const getDashboardStats = async (): Promise<DashboardStats> => {
  try {
    const response = await API.get(`/dashboard-stats`);
    return response.data;
  } catch (error) {
    console.error("GET /dashboard-stats failed:", error);
    // Fallback data to prevent UI crashes
    return {
      total_projects: 0,
      completed: 0,
      accuracy_rate: 0
    };
  }
};

// Get documents by episode ID
export const getDocumentByEpisodeId = async (episodeId: string): Promise<DocumentData> => {
  try {
    const response = await API.get(`/files/${episodeId}`);
    const data = response.data;
    
    // Transform new API response format to expected format
    if (data.files && data.presigned_urls) {
      const documents = data.files.map((fileName: string) => {
        const pageUrls = data.presigned_urls[fileName] || {};
        const totalPages = Object.keys(pageUrls).length;
        
        // Cache all page URLs
        Object.entries(pageUrls).forEach(([pageNum, url]) => {
          setCachedDocumentUrl(episodeId, fileName, pageNum, url as string);
        });
        
        return {
          document_name: fileName,
          url: pageUrls['1'] || '', // First page URL for compatibility
          total_pages: totalPages,
          page_urls: pageUrls
        };
      });
      
      return { documents };
    }
    
    // Fallback for old format
    if (data.documents) {
      data.documents.forEach((doc: any) => {
        setCachedDocumentUrl(episodeId, doc.document_name, '1', doc.url);
      });
      return data;
    }
    
    return { documents: [] };
  } catch (error) {
    console.error(`GET /files/${episodeId} failed:`, error);
    // Fallback data to prevent UI crashes
    return { documents: [] };
  }
};

// Get OASIS results by episode ID
export const getOasisResultsByEpisodeId = async (episodeId: string): Promise<{ results: OasisParentGuideline[] }> => {
  try {
    const response = await API.get(`/oasis-results/${episodeId}`);
    return response.data;
  } catch (error) {
    console.error(`GET /oasis-results/${episodeId} failed:`, error);
    // Fallback data to prevent UI crashes
    return { results: [] };
  }
};

// Get episode status
export const getEpisodeStatus = async (episodeId: string): Promise<EpisodeStatus> => {
  try {
    const response = await API.get(`/episode-status/${episodeId}`);
    return response.data;
  } catch (error) {
    console.error(`GET /episode-status/${episodeId} failed:`, error);
    // Fallback data
    return {
      episode_id: episodeId,
      status: 'failed',
      error: 'Failed to fetch episode status'
    };
  }
};

// Lock episode
export const lockEpisode = async (episodeId: string): Promise<{ message: string }> => {
  try {
    const response = await API.post(`/lock-episode/${episodeId}`);
    return response.data;
  } catch (error) {
    console.error(`POST /lock-episode/${episodeId} failed:`, error);
    throw error;
  }
};

// Search document by episode ID and search string
export const searchDocumentByEpisodeId = async (
  episodeId: string, 
  searchString: string
): Promise<any> => {
  try {
    const response = await API.post(`/search_document/${episodeId}`, {
      search_string: searchString,
    });
    return response.data;
  } catch (error) {
    console.error(`POST /search_document/${episodeId} failed:`, error);
    return { matches: [] }; // Fallback data
  }
};

// Authentication method
export const loginUser = async (username: string, password: string) => {
  try {
    const response = await API.post("/login", {
      username: username.trim(),
      password: password.trim(),
    });

    const data = response.data;

    if (data.access_token) {
      setApiToken(data.access_token);
    }

    return data;
  } catch (error) {
    console.error("POST /login failed:", error);
    throw error;
  }
};

// Update guideline decision
export const updateGuidelineDecision = async (
  episodeId: string, 
  guidelineId: string, 
  action: 'accept' | 'reject' | 'undo'
): Promise<{ message: string }> => {
  try {
    console.log('Updating guideline decision:', { episodeId, guidelineId, action });
    const response = await API.post("/guideline-decision", {
      episode_id: episodeId,
      guideline_id: guidelineId,
      action: action,
    });
    console.log('Guideline decision response:', response.data);
    return response.data;
  } catch (error) {
    console.error(`POST /guideline-decision failed:`, error);
    throw error;
  }
};

// Submit guideline rejection note
export const submitGuidelineRejectionNote = async (rejectionData: {
  episode_id: string;
  guideline_id: string;
  note: string;
}): Promise<{ message: string }> => {
  try {
    const response = await API.post("/guideline-rejection-note", rejectionData);
    return response.data;
  } catch (error) {
    console.error("POST /guideline-rejection-note failed:", error);
    throw error;
  }
};

// Process episode (if needed for UI)
export const processEpisode = async (episodeData: any): Promise<any> => {
  try {
    const response = await API.post("/process_episode", episodeData);
    return response.data;
  } catch (error) {
    console.error("POST /process_episode failed:", error);
    throw error;
  }
};

// Legacy support functions (for backward compatibility during transition)
export const getDocumentByMrn = async (mrn: string) => {
  console.warn("getDocumentByMrn is deprecated, use getDocumentByEpisodeId instead");
  return getDocumentByEpisodeId(mrn);
};

export const getOasisResultsByMrn = async (mrn: string) => {
  console.warn("getOasisResultsByMrn is deprecated, use getOasisResultsByEpisodeId instead");
  return getOasisResultsByEpisodeId(mrn);
};

export const searchDocumentByMrn = async (mrn: string, searchString: string) => {
  console.warn("searchDocumentByMrn is deprecated, use searchDocumentByEpisodeId instead");
  return searchDocumentByEpisodeId(mrn, searchString);
};

// Keep old function names for backward compatibility during transition
export const getOasisProjects = fetchOasisProjects;
export const searchOasisProjects = searchEpisodeProjects;