import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Filter,
  LogOut,
  RefreshCw,
  Search,
  User,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import PenguinLogo from "../assets/penguin-logo.svg";
import Penguin from "../assets/Penguinai-name.png";
import {
  getDashboardStats,
  getOasisProjects,
  searchOasisProjects,
} from "../services/api";
import CodingInterface from "./CodingInterface";

const Dashboard = ({ handleLogout }) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statsError, setStatsError] = useState(null);
  const [selectedMRN, setSelectedMRN] = useState(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({});
  const [metrics, setMetrics] = useState({});

  // Search related state
  const [searchTerm, setSearchTerm] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [showingSearchResults, setShowingSearchResults] = useState(false);

  // Status filter state
  const [selectedStatus, setSelectedStatus] = useState("");

  const entriesPerPage = 10;

  // Status options
  const statusOptions = [
    { value: "", label: "All Status" },
    { value: "IN REVIEW", label: "In Review" },
    { value: "YET TO START", label: "Yet to Review" },
    { value: "COMPLETED", label: "Completed" },
  ];

  const handleSearch = async () => {
    try {
      setIsSearching(true);
      setError(null);
      const results = await searchOasisProjects(searchTerm.trim());
      setSearchResults(results);
      setShowingSearchResults(true);
    } catch (error) {
      setError(error.message || "Failed to search projects");
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setSearchTerm("");
    setSearchResults([]);
    setShowingSearchResults(false);
    setError(null);
  };

  const fetchProjects = async (
    pageNum = currentPage,
    status = selectedStatus
  ) => {
    try {
      setLoading(true);
      setError(null);

      const data = await getOasisProjects(pageNum, entriesPerPage, status);
      setProjects(data.projects || []);
      setPagination(data.pagination || {});
      setCurrentPage(pageNum);
    } catch (err) {
      console.error("Error fetching projects:", err);
      setError(err.message || "Failed to fetch projects");
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchDashboardStats = async () => {
    try {
      setStatsLoading(true);
      setStatsError(null);

      const statsData = await getDashboardStats();
      setMetrics({
        total_projects: statsData.total_projects || 0,
        total_completed: statsData.completed || 0,
        total_accuracy: statsData.accuracy_rate || 0,
      });
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
      setStatsError(err.message || "Failed to fetch dashboard stats");
      setMetrics({
        total_projects: 0,
        total_completed: 0,
        total_accuracy: 0,
      });
    } finally {
      setStatsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchDashboardStats();
  }, []);

  const handleStartCoding = (mrn, episodeId) => {
    setSelectedMRN(mrn);
    setSelectedEpisodeId(episodeId);
  };

  const handleBackToDashboard = () => {
    setSelectedMRN(null);
    setSelectedEpisodeId(null);
    // Force refetch of data
    fetchProjects();
    fetchDashboardStats();
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.total_pages) {
      fetchProjects(newPage, selectedStatus);
    }
  };

  const handleRefresh = () => {
    if (showingSearchResults) {
      clearSearch();
    }
    fetchProjects(1, selectedStatus);
    fetchDashboardStats();
    setCurrentPage(1);
  };

  const handleStatusChange = (status) => {
    setSelectedStatus(status);
    setCurrentPage(1);
    fetchProjects(1, status);
  };

  if (selectedMRN) {
    return (
      <CodingInterface
        mrn={selectedMRN}
        episodeId={selectedEpisodeId}
        onBack={handleBackToDashboard}
        handleLogout={handleLogout}
      />
    );
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  if (loading && statsLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 overflow-auto font-sans">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
            <p className="text-lg font-semibold text-gray-700">
              Loading dashboard data...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Current data to display (either search results or regular projects)
  const currentData = showingSearchResults ? searchResults : projects;
  const currentLoading = showingSearchResults ? isSearching : loading;

  return (
    <div className="fixed inset-0 bg-white z-50 overflow-auto font-sans">
      {/* Dashboard Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo and Branding */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={PenguinLogo} alt="PenguinAI Logo" className="w-8 h-8" />
              <img src={Penguin} alt="PenguinAI" className="h-6" />
            </div>
          </div>

          {/* Right side - Actions and User Profile */}
          <div className="flex items-center gap-4">
            {(error || statsError) && (
              <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-3 py-2 rounded-lg border border-orange-200">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {error && statsError
                    ? "API Error - Using fallback data"
                    : error
                    ? "Projects API Error"
                    : "Stats API Error"}
                </span>
                <button
                  onClick={handleRefresh}
                  className="ml-2 text-orange-700 hover:text-orange-800 font-semibold"
                >
                  Retry
                </button>
              </div>
            )}

            {/* Refresh Button */}
            <button
              onClick={handleRefresh}
              className="p-2 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
              disabled={loading || statsLoading}
              title="Refresh"
            >
              <RefreshCw
                className={`w-5 h-5 ${
                  loading || statsLoading ? "animate-spin" : ""
                }`}
              />
            </button>

            <div className="flex items-center gap-3">
              {/* User Profile with Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    <span style={{ textTransform: "capitalize" }}>
                      {
                        JSON.parse(
                          localStorage.getItem("user_data")
                        )?.username.split("@")[0]
                      }
                    </span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 text-gray-500 transition-transform ${
                      showUserMenu ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* User Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                    {/* User Info Section */}
                    <div className="p-4 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                          <User className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div
                            className="text-sm text-gray-600"
                            style={{ textTransform: "capitalize" }}
                          >
                            {
                              JSON.parse(localStorage.getItem("user_data"))
                                ?.username
                            }
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Medical Coding Specialist
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="p-2">
                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-50 rounded-lg transition-colors group"
                      >
                        <div className="w-8 h-8 bg-red-100 group-hover:bg-red-200 rounded-full flex items-center justify-center transition-colors">
                          <LogOut className="w-4 h-4 text-red-600" />
                        </div>
                        <div>
                          <div className="font-medium text-gray-800 group-hover:text-red-800">
                            Sign Out
                          </div>
                          <div className="text-xs text-gray-500">
                            End current session
                          </div>
                        </div>
                      </button>
                    </div>

                    {/* Footer */}
                    <div className="p-3 border-t border-gray-100 bg-gray-50 rounded-b-lg">
                      <div className="text-xs text-gray-500 text-center">
                        PenguinAI Medical Coding Platform v2.1
                      </div>
                    </div>
                  </div>
                )}

                {/* Overlay to close dropdown when clicking outside */}
                {showUserMenu && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dashboard Content */}
      <div className="p-6  mx-auto" style={{ maxWidth: "90rem" }}>
        {/* Dashboard Title and Description */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            OASIS Scrubbing
          </h1>
          <p className="text-gray-600 font-medium">
            Dashboard overview Review and validate results across all episodes
          </p>
        </div>

        {/* Summary Metrics */}
        <div className="mb-8">
          <div className="grid grid-cols-3 gap-6">
            {/* Total Episodes */}
            <div
              className="bg-blue-50 border border-blue-200 rounded-lg pt-2 text-center"
              style={{ height: "135px" }}
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Activity className="w-6 h-6 text-blue-600" />
              </div>
              {statsLoading ? (
                <div className="text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-1 text-blue-600" />
                  <div className="text-sm font-semibold text-blue-700">
                    Loading...
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-blue-900 mb-1">
                    {metrics.total_projects || 0}
                  </div>
                  <div className="text-sm font-semibold text-blue-700">
                    Total Episodes
                  </div>
                </>
              )}
            </div>

            {/* Completed */}
            <div
              className="bg-green-50 border border-green-200 rounded-lg pt-2 text-center"
              style={{ height: "135px" }}
            >
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              {statsLoading ? (
                <div className="text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-1 text-green-600" />
                  <div className="text-sm font-semibold text-green-700">
                    Loading...
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-green-900 mb-1">
                    {metrics.total_completed || 0}
                  </div>
                  <div className="text-sm font-semibold text-green-700">
                    Completed
                  </div>
                </>
              )}
            </div>

            {/* Accuracy Rate */}
            <div
              className="bg-orange-50 border border-orange-200 rounded-lg pt-2 text-center"
              style={{ height: "135px" }}
            >
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
              {statsLoading ? (
                <div className="text-center">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-1 text-orange-600" />
                  <div className="text-sm font-semibold text-orange-700">
                    Loading...
                  </div>
                </div>
              ) : (
                <>
                  <div className="text-3xl font-bold text-orange-900 mb-1">
                    {metrics.total_accuracy
                      ? `${metrics.total_accuracy}%`
                      : "0%"}
                  </div>
                  <div className="text-sm font-semibold text-orange-700">
                    Accuracy Rate
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          {/* Right side: Status Legend */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
              <span
                className="text-sm font-medium text-gray-700"
                style={{ fontSize: "12px" }}
              >
                Questions Processed
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span
                  className="text-sm font-medium text-gray-700"
                  style={{ fontSize: "12px" }}
                >
                  Accepted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span
                  className="text-sm font-medium text-gray-700"
                  style={{ fontSize: "12px" }}
                >
                  Partially Accepted
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span
                  className="text-sm font-medium text-gray-700"
                  style={{ fontSize: "12px" }}
                >
                  Rejected
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Episodes Table */}
        <div className="mb-6">
          <div className="flex items-end justify-between mb-4">
            <div className="flex items-center gap-4">
              <h2 className="text-xl font-bold text-gray-900">
                Recent Episodes
              </h2>
              {showingSearchResults && (
                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 border border-blue-200 rounded-lg">
                  <Search className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">
                    Search Results for "{searchTerm}"
                  </span>
                  <button
                    onClick={clearSearch}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Filters and Search */}
            <div className="flex items-center gap-3 mt-7">
              {/* Status Filter */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={selectedStatus}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    className="appearance-none px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-sm font-medium min-w-[140px]"
                  >
                    {statusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                    <Filter className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

              {/* Search */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === "Enter") {
                        handleSearch();
                      }
                    }}
                    placeholder="Search by Episode ID..."
                    className="px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={!searchTerm.trim() || isSearching}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {isSearching ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    "Search"
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            {currentLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
                  <p className="text-lg font-semibold text-gray-700">
                    {isSearching
                      ? "Searching episodes..."
                      : "Loading episodes..."}
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        #
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Episode ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Created Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Code Review Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        AI Summary Review
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        User Acceptance Review
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Accuracy
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentData.map((episode, index) => {
                      const globalIndex = showingSearchResults
                        ? index + 1
                        : (currentPage - 1) * entriesPerPage + index + 1;
                      return (
                        <tr
                          key={episode.episode_id}
                          className="hover:bg-gray-50"
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-semibold text-gray-900">
                              {globalIndex}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <FileText className="w-4 h-4 text-blue-600" />
                              <div className="text-sm font-semibold text-gray-900">
                                {episode.episode_id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <div className="text-sm font-medium text-gray-900">
                                {formatDate(episode.created_at)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {episode.status === "COMPLETED" ? (
                                <>
                                  <CheckCircle className="w-4 h-4 text-green-600" />
                                  <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-green-100 text-green-800">
                                    COMPLETED
                                  </span>
                                </>
                              ) : episode.status === "YET TO START" ? (
                                <>
                                  <Clock className="w-4 h-4 text-gray-600" />
                                  <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-gray-100 text-gray-800">
                                    YET TO REVIEW
                                  </span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-4 h-4 text-yellow-600" />
                                  <span className="inline-flex px-2 py-1 text-xs font-bold rounded-full bg-yellow-100 text-yellow-800">
                                    {episode.status}
                                  </span>
                                </>
                              )}
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {/* Questions Processed Count */}
                              <div className="flex items-center gap-1 min-w-[30px]">
                                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                <span className="text-sm font-bold text-blue-600">
                                  {episode.questions_processed || 0}
                                </span>
                              </div>

                              {/* AI Accepted Count */}
                              <div className="flex items-center gap-1 min-w-[30px]">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-bold text-green-600">
                                  {episode.ai_accepted || 0}
                                </span>
                              </div>

                              {/* AI Partially Accepted Count */}
                              <div className="flex items-center gap-1 min-w-[30px]">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm font-bold text-yellow-600">
                                  {episode.ai_partially_accepted || 0}
                                </span>
                              </div>

                              {/* AI Rejected Count */}
                              <div className="flex items-center gap-1 min-w-[30px]">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-sm font-bold text-red-600">
                                  {episode.ai_rejected || 0}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-3">
                              {/* User Accepted Count */}
                              <div className="flex items-center gap-1 min-w-[30px]">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-sm font-bold text-green-600">
                                  {episode.user_accepted || 0}
                                </span>
                              </div>

                              {/* User Partially Accepted/Rejected Count */}
                              <div className="flex items-center gap-1 min-w-[30px]">
                                <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                                <span className="text-sm font-bold text-yellow-600">
                                  {episode.user_partially_accepted_rejected ||
                                    0}
                                </span>
                              </div>

                              {/* User Rejected Count */}
                              <div className="flex items-center gap-1 min-w-[30px]">
                                <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                <span className="text-sm font-bold text-red-600">
                                  {episode.user_rejected || 0}
                                </span>
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <div className="text-sm font-semibold text-gray-900">
                                {episode.accuracy && `${episode.accuracy}%`}
                              </div>
                            </div>
                          </td>

                          <td className="px-6 py-4 whitespace-nowrap">
                            <button
                              onClick={() =>
                                handleStartCoding(
                                  episode.mrn,
                                  episode.episode_id
                                )
                              }
                              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-sm"
                            >
                              <Eye className="w-4 h-4" />
                              View Results
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Pagination - only show for regular projects, not search results */}
        {!showingSearchResults && pagination.total_pages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-700">
              Showing{" "}
              <span className="font-medium">
                {(currentPage - 1) * entriesPerPage + 1}
              </span>{" "}
              to{" "}
              <span className="font-medium">
                {Math.min(currentPage * entriesPerPage, pagination.total_count)}
              </span>{" "}
              of <span className="font-medium">{pagination.total_count}</span>{" "}
              results
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={!pagination.has_prev}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {/* Page numbers */}
              {Array.from({ length: pagination.total_pages }, (_, i) => i + 1)
                .filter((page) => {
                  return (
                    Math.abs(page - currentPage) <= 2 ||
                    page === 1 ||
                    page === pagination.total_pages
                  );
                })
                .map((page, index, array) => {
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <div key={page} className="flex items-center">
                      {showEllipsis && (
                        <span className="px-2 text-gray-500">...</span>
                      )}
                      <button
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-2 text-sm font-medium rounded-md ${
                          currentPage === page
                            ? "bg-blue-600 text-white"
                            : "text-gray-700 bg-white border border-gray-300 hover:bg-gray-50"
                        }`}
                      >
                        {page}
                      </button>
                    </div>
                  );
                })}

              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={!pagination.has_next}
                className="px-3 py-2 text-sm font-medium text-gray-500 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Search Results Info */}
        {showingSearchResults && searchResults.length > 0 && (
          <div className="text-sm text-gray-700 mt-4">
            Found <span className="font-medium">{searchResults.length}</span>{" "}
            result{searchResults.length !== 1 ? "s" : ""} for Episode ID "
            {searchTerm}"
          </div>
        )}

        {/* No results messages */}
        {currentData.length === 0 && !currentLoading && (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500">
              {showingSearchResults
                ? "No episodes found for your search"
                : "No projects found"}
            </p>
            <p className="text-gray-400">
              {showingSearchResults
                ? "Try searching with a different Episode ID"
                : "Try refreshing the data"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
