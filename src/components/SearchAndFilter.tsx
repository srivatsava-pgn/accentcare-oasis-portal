import { Filter, Search } from "lucide-react";
import { useState } from "react";

// SearchAndFilter Component
export const SearchAndFilter = ({
  onSearchChange,
  onFilterChange,
  currentFilter,
  resultStats,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    onSearchChange(value);
  };

  const handleFilterSelect = (filterType) => {
    onFilterChange(filterType);
    setIsFilterOpen(false);
  };

  const filterOptions = [
    {
      value: "all",
      label: "All Guidelines",
      count: resultStats?.total || 0,
      color: "text-gray-700",
    },
    {
      value: "ai-accepted",
      label: "AI Accepted",
      count: resultStats?.aiAccepted || 0,
      color: "text-green-700",
    },
    {
      value: "ai-rejected",
      label: "AI Rejected",
      count: resultStats?.aiRejected || 0,
      color: "text-red-700",
    },
    {
      value: "user-accepted",
      label: "User Accepted",
      count: resultStats?.userAccepted || 0,
      color: "text-blue-700",
    },
    {
      value: "user-rejected",
      label: "User Rejected",
      count: resultStats?.userRejected || 0,
      color: "text-orange-700",
    },
  ];

  const currentFilterOption = filterOptions.find(
    (option) => option.value === currentFilter
  );

  return (
    <div className="flex items-center gap-3 mb-4">
      {/* Search Input */}
      <div className="flex-1 relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Search guidelines or questions..."
          value={searchTerm}
          onChange={handleSearchChange}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
        />
      </div>

      {/* Filter Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsFilterOpen(!isFilterOpen)}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
        >
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            {currentFilterOption?.label || "Filter"}
          </span>
          <svg
            className={`w-4 h-4 text-gray-500 transform transition-transform ${
              isFilterOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {/* Filter Dropdown Menu */}
        {isFilterOpen && (
          <>
            {/* Overlay to close dropdown when clicking outside */}
            <div
              className="fixed inset-0 z-10"
              onClick={() => setIsFilterOpen(false)}
            />
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
              <div className="py-1">
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleFilterSelect(option.value)}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center justify-between transition-colors ${
                      currentFilter === option.value
                        ? "bg-blue-50 text-blue-700"
                        : "text-gray-700"
                    }`}
                  >
                    <span className={option.color}>{option.label}</span>
                    <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                      {option.count}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
