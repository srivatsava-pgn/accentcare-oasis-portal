import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
// Import the advanced PDF viewer with NER support
import AdvancedPDFViewer from "./AdvancedPDFViewer";
import { getDocumentByEpisodeId, searchDocumentByEpisodeId } from "../services/api";

const PDFViewerSection = ({ 
  episodeId, 
  boundingBoxes = null, 
  highlightedDocumentName = null, 
  highlightedPageNumber = null 
}) => {
  const [documentData, setDocumentData] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    const fetchDocumentData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getDocumentByEpisodeId(episodeId);
        setDocumentData(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (episodeId) {
      fetchDocumentData();
    }
  }, [episodeId]);

  // Handle navigation when highlight is clicked
  useEffect(() => {
    if (highlightedDocumentName && highlightedPageNumber && documentData) {
      // Check if the highlighted document exists in our data
      const targetDoc = documentData.documents.find(doc => doc.document_name === highlightedDocumentName);
      if (targetDoc) {
        setSelectedDocument(highlightedDocumentName);
        setCurrentPage(highlightedPageNumber);
      }
    }
  }, [highlightedDocumentName, highlightedPageNumber, documentData]);

  const handleRetry = () => {
    setError(null);
    // Re-fetch document data on retry
    if (episodeId) {
      const fetchDocumentData = async () => {
        try {
          setLoading(true);
          setError(null);
          const data = await getDocumentByEpisodeId(episodeId);
          setDocumentData(data);
        } catch (error) {
          setError(error.message);
        } finally {
          setLoading(false);
        }
      };
      fetchDocumentData();
    }
  };

  const handleDocumentChange = (documentName) => {
    setSelectedDocument(documentName);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleAnnotationAdd = (annotation) => {
    console.log("Annotation added:", annotation);
    // Add your annotation handling logic here
    // For example, you might want to save the annotation to a backend service
    // or update local state to track annotations
  };

  const handleSearchPerformed = async (searchQuery) => {
    if (!searchQuery || !searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      const searchData = await searchDocumentByEpisodeId(episodeId, searchQuery.trim());

      setSearchResults(searchData || { matches: [] });
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults({ matches: [] });
      // Optionally show an error message to the user
      // setError(`Search failed: ${error.message}`);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-semibold text-gray-700">
            Loading PDF Documents...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Fetching files for Episode ID: {episodeId}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">
            Error Loading Documents
          </p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={handleRetry}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Advanced PDF Viewer Content with NER Support */}
      <div className="flex-1 overflow-hidden">
        {documentData ? (
          <AdvancedPDFViewer
            documentData={documentData}
            boundingBoxes={boundingBoxes}
            searchResults={searchResults}
            viewMode="pdf"
            selectedDocument={selectedDocument}
            currentPage={currentPage}
            onDocumentChange={handleDocumentChange}
            onPageChange={handlePageChange}
            onAnnotationAdd={handleAnnotationAdd}
            onSearchPerformed={handleSearchPerformed}
            setSearchResults={setSearchResults}
          />
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-500">
                No documents available
              </p>
              <p className="text-sm text-gray-400">
                No PDF files found for Episode ID: {episodeId}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewerSection;
