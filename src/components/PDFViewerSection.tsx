import { AlertCircle, FileText, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
// Import your PDF viewer library here
import PDFViewer from "../lib/pdf-viewer  ";
import { getDocumentByMrn, searchDocumentByMrn } from "../services/api";

const PDFViewerSection = ({ mrn, boundingBoxes = null }) => {
  const [documentData, setDocumentData] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchDocumentData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await getDocumentByMrn(mrn);
        setDocumentData(data);
      } catch (error) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    if (mrn) {
      fetchDocumentData();
    }
  }, [mrn]);

  const handleRetry = () => {
    setError(null);
    // fetchDocumentData();
  };

  const handleDocumentChange = (documentName) => {
    console.log("Document changed:", documentName);
  };

  const handlePageChange = (pageNumber) => {
    console.log("Page changed:", pageNumber);
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
      const searchData = await searchDocumentByMrn(mrn, searchQuery.trim());

      setSearchResults(searchData || {});
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults({});
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
            Fetching files for MRN: {mrn}
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
      {/* PDF Viewer Content */}
      <div className="flex-1 overflow-hidden">
        {documentData ? (
          <PDFViewer
            documentData={documentData}
            boundingBoxes={boundingBoxes}
            searchResults={searchResults}
            userInterfaces={{}}
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
                No PDF files found for MRN: {mrn}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewerSection;
