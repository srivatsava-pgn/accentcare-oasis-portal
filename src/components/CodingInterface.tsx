import { ChevronDown, LayoutDashboard, LogOut, User } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchOasisProjects } from "../services/api";
import penguinLogo from "../assets/penguin-logo.svg";
import penguinName from "../assets/Penguinai-name.png";
import PDFViewerSection from "./PDFViewerSection";
import ResultsSection from "./ResultsSection";

const CodingInterface = ({ episodeId, onBack, handleLogout }) => {
  const [boundingBoxes, setBoundingBoxes] = useState(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [episodeData, setEpisodeData] = useState(null);
  const [highlightedDocumentName, setHighlightedDocumentName] = useState(null);
  const [highlightedPageNumber, setHighlightedPageNumber] = useState(null);

  // Fetch episode data for statistics
  useEffect(() => {
    const fetchEpisodeData = async () => {
      try {
        const data = await fetchOasisProjects(1, 100, 'ALL'); // Get all episodes
        const episode = data.projects.find(p => p.episode_id === episodeId);
        setEpisodeData(episode);
      } catch (error) {
        console.error('Error fetching episode data:', error);
      }
    };

    if (episodeId) {
      fetchEpisodeData();
    }
  }, [episodeId]);

  // Handle highlighting from results section
  const handleHighlight = (supportingInfo) => {
    if (supportingInfo.bbox && supportingInfo.bbox.length > 0) {
      // Set the highlighted document and page for navigation
      setHighlightedDocumentName(supportingInfo.document_name);
      setHighlightedPageNumber(parseInt(supportingInfo.page_number));
      
      // Set the bounding box data for highlighting
      // PDFViewer expects: [{document_name, page_number, bbox: [[x1,y1,x2,y2,x3,y3,x4,y4], ...]}]
      // If supportingInfo.bbox is a single array of 8 coords, wrap it
      // If it's already an array of arrays, use as is
      let bboxArray;
      if (Array.isArray(supportingInfo.bbox[0])) {
        // Already an array of bbox arrays
        bboxArray = supportingInfo.bbox;
      } else {
        // Single bbox array, wrap it
        bboxArray = [supportingInfo.bbox];
      }
      
      setBoundingBoxes([{
        document_name: supportingInfo.document_name,
        page_number: parseInt(supportingInfo.page_number),
        bbox: bboxArray,
        supporting_sentence: supportingInfo.supporting_sentence_in_document,
        section_name: supportingInfo.section_name,
      }]);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          {/* Left side - Logo, Company Name, and MRN */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <img src={penguinLogo} alt="PenguinAI Logo" className="w-8 h-8" />
              <img src={penguinName} alt="PenguinAI" className="h-6" />
            </div>

            {/* Episode ID Info - Moved next to logo */}
            <div className="bg-blue-100 px-3 py-1 rounded-lg">
              <div className="text-sm font-bold text-blue-800">
                Episode Id: {episodeId}
              </div>
            </div>
          </div>

          {/* Right side - Dashboard Button and User Profile */}
          <div className="flex items-center gap-3">
            {/* Dashboard Button */}
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-semibold"
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

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
                  {" "}
                  {
                    JSON.parse(
                      localStorage.getItem("user_data")
                    )?.username.split("@")[0]
                  }
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
                      className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-red-50 rounded-lg transition-colors group"
                      onClick={handleLogout}
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

      {/* Split View Content - 45/55 ratio */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Side - PDF Viewer (45%) */}
        <div className="w-[45%] border-r border-gray-300 bg-white">
          <PDFViewerSection 
            episodeId={episodeId} 
            boundingBoxes={boundingBoxes}
            highlightedDocumentName={highlightedDocumentName}
            highlightedPageNumber={highlightedPageNumber}
          />
        </div>

        {/* Right Side - Results (55%) */}
        <div className="w-[55%] bg-gray-50">
          <ResultsSection 
            episodeId={episodeId} 
            onHighlight={handleHighlight}
            episodeData={episodeData}
          />
        </div>
      </div>
    </div>
  );
};

export default CodingInterface;
