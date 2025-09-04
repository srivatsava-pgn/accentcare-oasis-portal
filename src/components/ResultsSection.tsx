import {
  Activity,
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  RefreshCw,
  Save,
  ThumbsDown,
  ThumbsUp,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  getOasisResultsByMrn,
  submitGuidelineRejectionNote,
  updateGuidelineDecision,
} from "../services/api";
import { SearchAndFilter } from "./SearchAndFilter";

const ResultsSection = ({ mrn, onHighlight }) => {
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedGuidelines, setExpandedGuidelines] = useState(new Set());
  const [expandedSubQuestions, setExpandedSubQuestions] = useState(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [subQuestionDecisions, setSubQuestionDecisions] = useState(new Map());
  const [processingDecisions, setProcessingDecisions] = useState(new Set());
  const [rejectingSubQuestion, setRejectingSubQuestion] = useState(null);
  const [rejectForm, setRejectForm] = useState({
    answer: "",
    supportingEvidence: "",
    additionalNotes: "",
  });

  // Save functionality state
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  // Fetch results function - extracted to be reusable
  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await getOasisResultsByMrn(mrn);
      setResults(data);

      // Process existing user decisions and populate local state
      if (data?.results) {
        const existingDecisions = new Map();

        data.results.forEach((guideline) => {
          guideline.sub_questions.forEach((subQuestion, subIndex) => {
            const decisionKey = `${mrn}-${subQuestion.guideline_id}-${subIndex}`;

            // Check if there are existing user decisions
            if (
              subQuestion.user_decisions &&
              Object.keys(subQuestion.user_decisions).length > 0
            ) {
              // Get the first (and likely only) user decision
              const userKey = Object.keys(subQuestion.user_decisions)[0];
              const decision = subQuestion.user_decisions[userKey];

              existingDecisions.set(decisionKey, {
                action: decision.status, // "accept" or "reject"
                timestamp: decision.decided_at,
                userAnswer: decision.rejection_details?.user_answer,
                supportingEvidence:
                  decision.rejection_details?.supporting_evidence,
                additionalNotes: decision.rejection_details?.additional_notes,
                submittedBy: decision.rejection_details?.submitted_by,
              });
            }
          });
        });

        setSubQuestionDecisions(existingDecisions);
      }
    } catch (error) {
      console.error("Error fetching results:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Refresh statistics after decision update
  const refreshStatistics = async () => {
    try {
      const data = await getOasisResultsByMrn(mrn);
      setResults(data);
    } catch (error) {
      console.error("Error refreshing statistics:", error);
      // Don't show error to user for statistics refresh, just log it
    }
  };

  useEffect(() => {
    if (mrn) {
      fetchResults();
    }
  }, [mrn]);

  const handleRetry = () => {
    setError(null);
    setLoading(false);
  };

  const toggleGuideline = (guidelineId) => {
    const newExpanded = new Set(expandedGuidelines);
    if (newExpanded.has(guidelineId)) {
      newExpanded.delete(guidelineId);
    } else {
      newExpanded.add(guidelineId);
    }
    setExpandedGuidelines(newExpanded);
  };

  const toggleSubQuestion = (subQuestionId) => {
    const newExpanded = new Set(expandedSubQuestions);
    if (newExpanded.has(subQuestionId)) {
      newExpanded.delete(subQuestionId);
    } else {
      newExpanded.add(subQuestionId);
    }
    setExpandedSubQuestions(newExpanded);
  };

  const handleSubQuestionDecision = async (
    guidelineId,
    subQuestionIndex,
    action
  ) => {
    const decisionKey = `${mrn}-${guidelineId}-${subQuestionIndex}`;

    if (action === "reject") {
      setRejectingSubQuestion({ guidelineId, subQuestionIndex });
      setRejectForm({
        answer: "",
        supportingEvidence: "",
        additionalNotes: "",
      });
      return;
    }

    try {
      setProcessingDecisions((prev) => new Set(prev).add(decisionKey));

      await updateGuidelineDecision(mrn, guidelineId, action);

      setSubQuestionDecisions((prev) => {
        const newDecisions = new Map(prev);
        if (action === "undo") {
          newDecisions.delete(decisionKey);
        } else {
          newDecisions.set(decisionKey, {
            action,
            timestamp: new Date().toISOString(),
          });
        }
        return newDecisions;
      });

      // Refresh statistics after successful decision update
      await refreshStatistics();
    } catch (error) {
      console.error(`Error ${action}ing sub-question:`, error);
      setError(`Failed to ${action} sub-question: ${error.message}`);
    } finally {
      setProcessingDecisions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(decisionKey);
        return newSet;
      });
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectingSubQuestion) return;

    const { guidelineId, subQuestionIndex } = rejectingSubQuestion;
    const decisionKey = `${mrn}-${guidelineId}-${subQuestionIndex}`;

    try {
      setProcessingDecisions((prev) => new Set(prev).add(decisionKey));

      // Call both APIs in parallel
      const [decisionResponse, rejectionResponse] = await Promise.all([
        updateGuidelineDecision(mrn, guidelineId, "reject"),
        submitGuidelineRejectionNote({
          mrn,
          guideline_id: guidelineId,
          user_answer: rejectForm.answer,
          supporting_evidence: rejectForm.supportingEvidence,
          additional_notes: rejectForm.additionalNotes,
        }),
      ]);

      setSubQuestionDecisions((prev) => {
        const newDecisions = new Map(prev);
        newDecisions.set(decisionKey, {
          action: "reject",
          timestamp: new Date().toISOString(),
          userAnswer: rejectForm.answer,
          supportingEvidence: rejectForm.supportingEvidence,
          additionalNotes: rejectForm.additionalNotes,
        });
        return newDecisions;
      });

      setRejectingSubQuestion(null);
      setRejectForm({
        answer: "",
        supportingEvidence: "",
        additionalNotes: "",
      });

      // Refresh statistics after successful rejection
      await refreshStatistics();
    } catch (error) {
      console.error("Error rejecting sub-question:", error);
      setError(`Failed to reject sub-question: ${error.message}`);
    } finally {
      setProcessingDecisions((prev) => {
        const newSet = new Set(prev);
        newSet.delete(decisionKey);
        return newSet;
      });
    }
  };

  const handleRejectCancel = () => {
    setRejectingSubQuestion(null);
    setRejectForm({
      answer: "",
      supportingEvidence: "",
      additionalNotes: "",
    });
  };

  // Save all changes handler
  const handleSaveAll = async () => {
    try {
      setIsSaving(true);
      setShowSuccessMessage(false);

      // Simulate API call to save all changes
      // In a real implementation, you would call your save API here
      await new Promise((resolve) => setTimeout(resolve, 2000));

      setShowSuccessMessage(true);

      // Hide success message after 3 seconds
      setTimeout(() => {
        setShowSuccessMessage(false);
      }, 3000);
    } catch (error) {
      console.error("Error saving changes:", error);
      setError("Failed to save changes");
    } finally {
      setIsSaving(false);
    }
  };

  const getSubQuestionDecision = (guidelineId, subQuestionIndex) => {
    const decisionKey = `${mrn}-${guidelineId}-${subQuestionIndex}`;
    return subQuestionDecisions.get(decisionKey);
  };

  const isProcessingSubQuestionDecision = (guidelineId, subQuestionIndex) => {
    const decisionKey = `${mrn}-${guidelineId}-${subQuestionIndex}`;
    return processingDecisions.has(decisionKey);
  };

  const getMatchIcon = (match) => {
    if (match === "True" || match === true) {
      return <CheckCircle className="w-4 h-4 text-green-600" />;
    }
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getMatchBadge = (match) => {
    if (match === "True" || match === true) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3" />
          Match
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
        <XCircle className="w-3 h-3" />
        No Match
      </span>
    );
  };

  const getSubQuestionDecisionBadge = (decision) => {
    if (!decision) return null;

    if (decision.action === "accept") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
          <ThumbsUp className="w-3 h-3" />
          User Accepted
        </span>
      );
    } else if (decision.action === "reject") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800">
          <ThumbsDown className="w-3 h-3" />
          User Rejected
        </span>
      );
    }
    return null;
  };

  const formatAnswer = (answer) => {
    if (Array.isArray(answer)) {
      return answer.join(", ");
    }
    return answer || "N/A";
  };

  const handleHighlightClick = (supportingInfo) => {
    if (onHighlight) {
      onHighlight(supportingInfo);
    }
  };

  const handleSearchChange = (term) => {
    setSearchTerm(term);
  };

  const handleFilterChange = (filter) => {
    setFilterType(filter);
  };

  const getGuidelineMatchRatio = (subQuestions) => {
    const totalQuestions = subQuestions.length;
    const matchedQuestions = subQuestions.filter(
      (sq) => sq.match_with_coder === "True" || sq.match_with_coder === true
    ).length;
    return `${matchedQuestions}/${totalQuestions}`;
  };

  // Updated function to return match status instead of boolean
  const getGuidelineMatchStatus = (subQuestions) => {
    const totalQuestions = subQuestions.length;
    const matchedQuestions = subQuestions.filter(
      (sq) => sq.match_with_coder === "True" || sq.match_with_coder === true
    ).length;

    if (matchedQuestions === totalQuestions) {
      return "full"; // All match
    } else if (matchedQuestions === 0) {
      return "none"; // No match
    } else {
      return "partial"; // Some match
    }
  };

  // New function to get user decision status for a guideline
  const getUserDecisionStatus = (guideline) => {
    const totalSubQuestions = guideline.sub_questions.length;
    const decisions = guideline.sub_questions.map((subQuestion, subIndex) => {
      const decision = getSubQuestionDecision(
        subQuestion.guideline_id,
        subIndex
      );
      return decision?.action;
    });

    // Count decisions
    const acceptedCount = decisions.filter((d) => d === "accept").length;
    const rejectedCount = decisions.filter((d) => d === "reject").length;
    const decidedCount = acceptedCount + rejectedCount;

    // No decisions made at all
    if (decidedCount === 0) {
      return "none";
    }

    // All sub-questions have been decided
    if (decidedCount === totalSubQuestions) {
      if (rejectedCount === 0) {
        return "accepted"; // All accepted
      } else if (acceptedCount === 0) {
        return "rejected"; // All rejected
      } else {
        return "partial"; // Mix of accept and reject
      }
    }

    // Not all sub-questions have been decided (partial completion)
    return "partial";
  };

  // Helper function to get match icon with appropriate color
  const getGuidelineMatchIcon = (subQuestions) => {
    const status = getGuidelineMatchStatus(subQuestions);

    switch (status) {
      case "full":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "none":
        return <XCircle className="w-5 h-5 text-red-600" />;
      case "partial":
        return <CheckCircle className="w-5 h-5 text-yellow-600" />;
      default:
        return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  // Helper function to get user decision icon with appropriate color
  const getUserDecisionIcon = (guideline) => {
    const status = getUserDecisionStatus(guideline);

    switch (status) {
      case "accepted":
        return <ThumbsUp className="w-4 h-4 text-green-600" />;
      case "rejected":
        return <ThumbsDown className="w-4 h-4 text-red-600" />;
      case "partial":
        return <ThumbsUp className="w-4 h-4 text-yellow-600" />;
      default:
        return null; // No icon when no decisions made
    }
  };

  // Helper functions for user decision filtering
  const hasUserAcceptedSubQuestions = (guideline) => {
    return guideline.sub_questions.some((subQuestion, subIndex) => {
      const decision = getSubQuestionDecision(
        subQuestion.guideline_id,
        subIndex
      );
      return decision && decision.action === "accept";
    });
  };

  const hasUserRejectedSubQuestions = (guideline) => {
    return guideline.sub_questions.some((subQuestion, subIndex) => {
      const decision = getSubQuestionDecision(
        subQuestion.guideline_id,
        subIndex
      );
      return decision && decision.action === "reject";
    });
  };

  // Filter and search logic - updated to use new status functions
  const filteredGuidelines = useMemo(() => {
    const guidelines = results?.results || [];

    let filtered = guidelines;

    // Apply filter - updated filter values to match new labels
    if (filterType === "ai-accepted") {
      filtered = filtered.filter(
        (guideline) =>
          getGuidelineMatchStatus(guideline.sub_questions) === "full"
      );
    } else if (filterType === "ai-rejected") {
      filtered = filtered.filter(
        (guideline) =>
          getGuidelineMatchStatus(guideline.sub_questions) === "none"
      );
    } else if (filterType === "user-accepted") {
      filtered = filtered.filter((guideline) =>
        hasUserAcceptedSubQuestions(guideline)
      );
    } else if (filterType === "user-rejected") {
      filtered = filtered.filter((guideline) =>
        hasUserRejectedSubQuestions(guideline)
      );
    }

    // Apply search
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (guideline) =>
          guideline.guideline_id.toLowerCase().includes(searchLower) ||
          guideline.sub_questions.some(
            (sq) =>
              sq.guideline_id.toLowerCase().includes(searchLower) ||
              sq.question?.toLowerCase().includes(searchLower) ||
              sq.reasoning?.toLowerCase().includes(searchLower)
          )
      );
    }

    return filtered;
  }, [results?.results, filterType, searchTerm, subQuestionDecisions]);

  // Calculate stats for filter component - updated to use new filter values
  const resultStats = useMemo(() => {
    const guidelines = results?.results || [];
    const aiAccepted = guidelines.filter(
      (guideline) => getGuidelineMatchStatus(guideline.sub_questions) === "full"
    ).length;
    const aiRejected = guidelines.filter(
      (guideline) => getGuidelineMatchStatus(guideline.sub_questions) === "none"
    ).length;
    const userAccepted = guidelines.filter((guideline) =>
      hasUserAcceptedSubQuestions(guideline)
    ).length;
    const userRejected = guidelines.filter((guideline) =>
      hasUserRejectedSubQuestions(guideline)
    ).length;

    return {
      total: guidelines.length,
      aiAccepted,
      aiRejected,
      userAccepted,
      userRejected,
    };
  }, [results?.results, subQuestionDecisions]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-semibold text-gray-700">
            Loading Results...
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Fetching OASIS results for MRN: {mrn}
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
            Error Loading Results
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

  const guidelines = results?.results || [];
  const statistics = results?.statistics || {};

  return (
    <div className="h-full flex flex-col">
      {/* Statistics Legend */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">
            OASIS Guidelines
          </h3>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center font-bold gap-1">
              Accuracy: {statistics.accuracy}
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4 text-green-600" />
              {statistics.matched_guidelines || 0}
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-4 h-4 text-red-600" />
              {(statistics.total_guidelines || 0) -
                (statistics.matched_guidelines || 0)}
            </span>
            <span>
              {filteredGuidelines.length} of {guidelines.length} guidelines
            </span>
          </div>
        </div>

        {/* Statistics with Legend Colors */}
        <div className="flex items-center gap-6 mb-3">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-sm text-gray-600">
              Questions Processed: {statistics.questions_processed || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">
              AI Accepted: {statistics.ai_accepted || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-gray-600">
              AI Partially Accepted: {statistics.ai_partially_accepted || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-gray-600">
              AI Rejected: {statistics.ai_rejected || 0}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-6 mb-3">
          <div className="flex items-center gap-2">
            {/* <span className="w-3 h-3 bg-green-500 rounded-full"></span> */}
            <ThumbsUp className="w-4 h-4 text-green-600" />
            <span className="text-sm text-gray-600">
              User Accepted: {statistics.user_accepted || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-gray-600">
              User Partially Accepted:
              {statistics.user_partially_accepted_rejected || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-600" />
            <span className="text-sm text-gray-600">
              User Rejected: {statistics.user_rejected || 0}
            </span>
          </div>
        </div>

        {/* Search and Filter */}
        <SearchAndFilter
          onSearchChange={handleSearchChange}
          onFilterChange={handleFilterChange}
          currentFilter={filterType}
          resultStats={resultStats}
        />
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredGuidelines.length > 0 ? (
          <div className="space-y-4">
            {filteredGuidelines.map((guideline, index) => {
              const isGuidelineExpanded = expandedGuidelines.has(
                guideline.guideline_id
              );
              const matchRatio = getGuidelineMatchRatio(
                guideline.sub_questions
              );

              return (
                <div
                  key={guideline.guideline_id}
                  className="bg-white rounded-lg shadow border hover:shadow-md transition-shadow"
                >
                  {/* Guideline Header */}
                  <div
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleGuideline(guideline.guideline_id)}
                  >
                    <div className="flex items-center gap-3">
                      {isGuidelineExpanded ? (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-400" />
                      )}

                      <h4 className="text-lg font-semibold text-gray-900">
                        {guideline.guideline_id}
                      </h4>

                      <span className="text-sm text-gray-500">
                        {guideline.sub_questions.length} question
                        {guideline.sub_questions.length !== 1 ? "s" : ""}
                      </span>
                      {guideline.title && (
                        <span className="text-xs italic text-gray-600">
                          {guideline.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3">
                      {/* Updated Match Icon with new color logic */}
                      {getGuidelineMatchIcon(guideline.sub_questions)}
                      <span className="text-sm font-medium text-gray-700">
                        {matchRatio}
                      </span>

                      {/* Updated User Decision Icon with new color logic */}
                      {getUserDecisionIcon(guideline)}
                    </div>
                  </div>

                  {/* Sub Questions */}
                  {isGuidelineExpanded && (
                    <div className="border-t border-gray-200">
                      {guideline.sub_questions.map((subQuestion, subIndex) => {
                        const subQuestionId = `${subQuestion.guideline_id}-${subIndex}`;
                        const isSubQuestionExpanded =
                          expandedSubQuestions.has(subQuestionId);
                        const subQuestionDecision = getSubQuestionDecision(
                          subQuestion.guideline_id,
                          subIndex
                        );
                        const isProcessingSubQuestion =
                          isProcessingSubQuestionDecision(
                            subQuestion.guideline_id,
                            subIndex
                          );

                        return (
                          <div
                            key={subQuestionId}
                            className="border-b border-gray-100 last:border-b-0"
                          >
                            {/* Sub Question Header */}
                            <div
                              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                              onClick={() => toggleSubQuestion(subQuestionId)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="text-sm font-medium text-gray-600">
                                  {subQuestion.guideline_id}
                                </span>
                                <span className="text-sm text-gray-500">
                                  #{subIndex + 1}
                                </span>
                                {getMatchBadge(subQuestion.match_with_coder)}
                                {getSubQuestionDecisionBadge(
                                  subQuestionDecision
                                )}
                              </div>
                              <button className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                                {isSubQuestionExpanded ? (
                                  <>
                                    <EyeOff className="w-4 h-4" />
                                    Collapse
                                  </>
                                ) : (
                                  <>
                                    <Eye className="w-4 h-4" />
                                    Details
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Sub Question Details */}
                            {isSubQuestionExpanded && (
                              <div className="px-4 pb-4 space-y-4">
                                {/* Question */}
                                <div>
                                  <h5 className="text-base font-medium text-gray-900 mb-3">
                                    {subQuestion.question}
                                  </h5>
                                </div>
                                {/* Available Options */}
                                <div>
                                  <h6 className="text-sm font-medium text-gray-700 mb-2">
                                    Available Options:
                                  </h6>
                                  <div className="bg-gray-50 rounded p-3 space-y-1">
                                    {subQuestion.option_descriptions?.map(
                                      (option, idx) => (
                                        <div
                                          key={idx}
                                          className="text-sm text-gray-700"
                                        >
                                          <span className="font-medium">
                                            {option.option}:
                                          </span>{" "}
                                          {option.description}
                                        </div>
                                      )
                                    )}
                                  </div>
                                </div>
                                {/* Special Instructions */}
                                {subQuestion.instructions
                                  ?.special_instructions && (
                                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                    <h6 className="text-sm font-medium text-amber-800 mb-1">
                                      Special Instructions:
                                    </h6>
                                    <p className="text-sm text-amber-700">
                                      {
                                        subQuestion.instructions
                                          .special_instructions
                                      }
                                    </p>
                                  </div>
                                )}
                                {subQuestion.instructions
                                  ?.coding_instructions && (
                                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                    <h6 className="text-sm font-medium text-amber-800 mb-1">
                                      Coding Instructions:
                                    </h6>
                                    <p className="text-sm text-amber-700">
                                      {
                                        subQuestion.instructions
                                          .coding_instructions
                                      }
                                    </p>
                                  </div>
                                )}
                                {subQuestion.instructions
                                  ?.response_specific_instructions && (
                                  <div className="bg-amber-50 border border-amber-200 rounded p-3">
                                    <h6 className="text-sm font-medium text-amber-800 mb-1">
                                      Response Specific Instructions
                                    </h6>
                                    <p className="text-sm text-amber-700">
                                      {
                                        subQuestion.instructions
                                          .response_specific_instructions
                                      }
                                    </p>
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">
                                          i
                                        </span>
                                      </div>
                                      <span className="text-sm font-medium text-gray-700">
                                        AI Prediction
                                      </span>
                                    </div>
                                    <div className="p-3 rounded border bg-blue-50 border-blue-200">
                                      <span className="font-medium">
                                        {formatAnswer(
                                          subQuestion.predicted_answer
                                        )}
                                      </span>
                                    </div>
                                  </div>

                                  <div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="w-4 h-4 rounded-full bg-purple-500 flex items-center justify-center">
                                        <Eye className="w-2.5 h-2.5 text-white" />
                                      </div>
                                      <span className="text-sm font-medium text-gray-700">
                                        Human Coder
                                      </span>
                                    </div>
                                    <div className="bg-purple-50 p-3 rounded border border-purple-200">
                                      <span className="font-medium">
                                        {formatAnswer(
                                          subQuestion.human_coder_answer
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                {/* Decision UI */}
                                {!subQuestionDecision &&
                                  rejectingSubQuestion?.guidelineId !==
                                    subQuestion.guideline_id &&
                                  rejectingSubQuestion?.subQuestionIndex !==
                                    subIndex && (
                                    <div className="flex gap-2">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSubQuestionDecision(
                                            subQuestion.guideline_id,
                                            subIndex,
                                            "accept"
                                          );
                                        }}
                                        disabled={isProcessingSubQuestion}
                                        className="flex items-center justify-center gap-1 px-3 py-1.5 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                        {isProcessingSubQuestion ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <CheckCircle className="w-3 h-3" />
                                        )}
                                        Accept AI Prediction
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleSubQuestionDecision(
                                            subQuestion.guideline_id,
                                            subIndex,
                                            "reject"
                                          );
                                        }}
                                        disabled={isProcessingSubQuestion}
                                        className="flex items-center justify-center gap-1 px-3 py-1.5 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                      >
                                        {isProcessingSubQuestion ? (
                                          <RefreshCw className="w-3 h-3 animate-spin" />
                                        ) : (
                                          <XCircle className="w-3 h-3" />
                                        )}
                                        Reject AI Prediction
                                      </button>
                                    </div>
                                  )}
                                {/* Accepted State */}
                                {subQuestionDecision &&
                                  subQuestionDecision.action === "accept" && (
                                    <div className="bg-green-50 border border-green-200 rounded p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <ThumbsUp className="w-4 h-4 text-green-600" />
                                          <span className="text-green-800 font-medium text-sm">
                                            User Accepted
                                          </span>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSubQuestionDecision(
                                              subQuestion.guideline_id,
                                              subIndex,
                                              "undo"
                                            );
                                          }}
                                          disabled={isProcessingSubQuestion}
                                          className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                                        >
                                          <X className="w-3 h-3" />
                                          Remove
                                        </button>
                                      </div>
                                      <p className="text-xs text-green-700 mt-1">
                                        Reviewed on{" "}
                                        {new Date(
                                          subQuestionDecision.timestamp
                                        ).toLocaleDateString()}
                                        {subQuestionDecision.submittedBy && (
                                          <span>
                                            {" "}
                                            by {subQuestionDecision.submittedBy}
                                          </span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                {/* Rejected State */}
                                {subQuestionDecision &&
                                  subQuestionDecision.action === "reject" && (
                                    <div className="bg-red-50 border border-red-200 rounded p-3">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <ThumbsDown className="w-4 h-4 text-red-600" />
                                          <span className="text-red-800 font-medium text-sm">
                                            User Rejected
                                          </span>
                                        </div>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleSubQuestionDecision(
                                              subQuestion.guideline_id,
                                              subIndex,
                                              "undo"
                                            );
                                          }}
                                          disabled={isProcessingSubQuestion}
                                          className="text-red-600 hover:text-red-700 flex items-center gap-1 text-sm"
                                        >
                                          <X className="w-3 h-3" />
                                          Remove
                                        </button>
                                      </div>
                                      <p className="text-xs text-red-700 mt-1">
                                        Reviewed on{" "}
                                        {new Date(
                                          subQuestionDecision.timestamp
                                        ).toLocaleDateString()}
                                        {subQuestionDecision.submittedBy && (
                                          <span>
                                            {" "}
                                            by {subQuestionDecision.submittedBy}
                                          </span>
                                        )}
                                      </p>

                                      {/* Show rejection details if they exist */}
                                      {subQuestionDecision.userAnswer && (
                                        <div className="mt-3 space-y-2 bg-white rounded p-3 border border-red-200">
                                          <div>
                                            <span className="text-xs font-medium text-gray-700">
                                              User Answer:
                                            </span>
                                            <p className="text-sm text-gray-900">
                                              {subQuestionDecision.userAnswer}
                                            </p>
                                          </div>

                                          {subQuestionDecision.supportingEvidence && (
                                            <div>
                                              <span className="text-xs font-medium text-gray-700">
                                                Supporting Evidence:
                                              </span>
                                              <p className="text-sm text-gray-900">
                                                {
                                                  subQuestionDecision.supportingEvidence
                                                }
                                              </p>
                                            </div>
                                          )}

                                          {subQuestionDecision.additionalNotes && (
                                            <div>
                                              <span className="text-xs font-medium text-gray-700">
                                                Additional Notes:
                                              </span>
                                              <p className="text-sm text-gray-900">
                                                {
                                                  subQuestionDecision.additionalNotes
                                                }
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                {/* Reject Form */}
                                {rejectingSubQuestion?.guidelineId ===
                                  subQuestion.guideline_id &&
                                  rejectingSubQuestion?.subQuestionIndex ===
                                    subIndex && (
                                    <div className="bg-orange-50 border border-orange-200 rounded p-4">
                                      <h6 className="text-base font-medium text-orange-800 mb-3">
                                        Reject AI Prediction
                                      </h6>

                                      <div className="space-y-3">
                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Your Answer *
                                          </label>
                                          <input
                                            type="text"
                                            value={rejectForm.answer}
                                            onChange={(e) =>
                                              setRejectForm({
                                                ...rejectForm,
                                                answer: e.target.value,
                                              })
                                            }
                                            placeholder="Enter your answer..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Supporting Evidence
                                          </label>
                                          <textarea
                                            value={
                                              rejectForm.supportingEvidence
                                            }
                                            onChange={(e) =>
                                              setRejectForm({
                                                ...rejectForm,
                                                supportingEvidence:
                                                  e.target.value,
                                              })
                                            }
                                            placeholder="Quote the specific text that supports your answer..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                        </div>

                                        <div>
                                          <label className="block text-sm font-medium text-gray-700 mb-1">
                                            Additional Notes
                                          </label>
                                          <textarea
                                            value={rejectForm.additionalNotes}
                                            onChange={(e) =>
                                              setRejectForm({
                                                ...rejectForm,
                                                additionalNotes: e.target.value,
                                              })
                                            }
                                            placeholder="Any additional comments or reasoning..."
                                            className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                          />
                                        </div>

                                        <div className="flex gap-2">
                                          <button
                                            onClick={handleRejectSubmit}
                                            disabled={
                                              !rejectForm.answer.trim() ||
                                              isProcessingSubQuestion
                                            }
                                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                          >
                                            {isProcessingSubQuestion ? (
                                              <RefreshCw className="w-3 h-3 animate-spin" />
                                            ) : (
                                              <Save className="w-3 h-3" />
                                            )}
                                            Save Review
                                          </button>
                                          <button
                                            onClick={handleRejectCancel}
                                            className="flex items-center gap-1 px-3 py-1.5 bg-gray-500 text-white text-sm rounded hover:bg-gray-600 transition-colors"
                                          >
                                            <X className="w-3 h-3" />
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                {/* Supporting Evidence */}
                                {subQuestion.supporting_info &&
                                  subQuestion.supporting_info.length > 0 && (
                                    <div>
                                      <div className="flex items-center gap-2 mb-2">
                                        <FileText className="w-4 h-4 text-gray-500" />
                                        <span className="text-sm font-medium text-gray-700">
                                          Supporting Evidence
                                        </span>
                                        <span className="text-xs text-gray-500">
                                          ({subQuestion.supporting_info.length}{" "}
                                          items)
                                        </span>
                                      </div>
                                      <div className="space-y-2">
                                        {subQuestion.supporting_info.map(
                                          (info, idx) => (
                                            <div
                                              key={idx}
                                              className="bg-gray-50 border-l-4 border-blue-400 rounded-r p-3"
                                            >
                                              <p className="text-sm text-gray-700 font-medium mb-2">
                                                "
                                                {
                                                  info.supporting_sentence_in_document
                                                }
                                                "
                                              </p>
                                              <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3 text-xs text-gray-500">
                                                  <span className="flex items-center gap-1">
                                                    <FileText className="w-3 h-3" />
                                                    {info.document_name}
                                                  </span>
                                                  <span>
                                                    Page {info.page_number}
                                                  </span>
                                                  <span className="text-blue-600">
                                                    {info.bbox?.length || 0}{" "}
                                                    highlight
                                                    {info.bbox?.length !== 1
                                                      ? "s"
                                                      : ""}{" "}
                                                    available
                                                  </span>
                                                </div>
                                                {info.bbox &&
                                                  info.bbox.length > 0 && (
                                                    <button
                                                      onClick={() =>
                                                        handleHighlightClick(
                                                          info
                                                        )
                                                      }
                                                      className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors"
                                                    >
                                                      Highlight {idx + 1}
                                                    </button>
                                                  )}
                                              </div>
                                            </div>
                                          )
                                        )}
                                      </div>
                                    </div>
                                  )}
                                {/* AI Reasoning */}
                                {subQuestion.reasoning && (
                                  <div className="bg-gray-50 rounded p-3">
                                    <h6 className="text-sm font-medium text-gray-700 mb-1">
                                      AI Reasoning:
                                    </h6>
                                    <p className="text-sm text-gray-600 leading-relaxed">
                                      {subQuestion.reasoning}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Save Button */}
            <div className="flex justify-end pt-6 pb-4">
              <button
                onClick={handleSaveAll}
                disabled={isSaving}
                className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 ${
                  isSaving
                    ? "bg-gray-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-105"
                }`}
              >
                <Save className={`w-5 h-5 ${isSaving ? "animate-spin" : ""}`} />
                {isSaving ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            {guidelines.length === 0 ? (
              <>
                <p className="text-lg font-medium text-gray-500">
                  No results found
                </p>
                <p className="text-gray-400">
                  No guidelines available for this MRN
                </p>
              </>
            ) : (
              <>
                <p className="text-lg font-medium text-gray-500">
                  No guidelines match your criteria
                </p>
                <p className="text-gray-400">
                  Try adjusting your search term or filter selection
                </p>
                <button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterType("all");
                  }}
                  className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Clear Filters
                </button>
              </>
            )}
            {/* Save Button - only show if there are guidelines */}
            {guidelines.length > 0 && (
              <div className="flex justify-end pt-6 pb-4">
                <button
                  onClick={handleSaveAll}
                  disabled={isSaving}
                  className={`inline-flex items-center gap-2 px-6 py-3 rounded-lg text-white font-medium transition-all duration-200 ${
                    isSaving
                      ? "bg-gray-400 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg transform hover:scale-105"
                  }`}
                >
                  <Save
                    className={`w-5 h-5 ${isSaving ? "animate-spin" : ""}`}
                  />
                  {isSaving ? "Saving..." : "Save"}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success Message Toast */}
      {showSuccessMessage && (
        <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-2 z-50 animate-slide-in">
          <CheckCircle className="w-5 h-5" />
          <span className="font-medium">All changes saved successfully!</span>
        </div>
      )}
    </div>
  );
};

export default ResultsSection;
