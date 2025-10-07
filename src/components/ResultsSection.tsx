import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  X,
  MessageSquare,
  ChevronRight,
  ChevronDown,
  Search,
  Filter,
  Eye,
  Sparkles,
} from 'lucide-react';
import {
  getOasisResultsByEpisodeId,
  updateGuidelineDecision,
  submitGuidelineRejectionNote,
} from '../services/api';
import type { OasisParentGuideline, OasisChildGuideline } from '../types';

interface ResultsSectionProps {
  episodeId: string;
  onHighlight?: (supportingInfo: any) => void;
  episodeData?: any; // Episode data from dashboard API
}

const ResultsSection: React.FC<ResultsSectionProps> = ({ episodeId, onHighlight, episodeData }) => {
  const [results, setResults] = useState<OasisParentGuideline[]>([]);
  const [filteredResults, setFilteredResults] = useState<OasisParentGuideline[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [currentFilter, setCurrentFilter] = useState('all');
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  // UI state
  const [expandedGuidelines, setExpandedGuidelines] = useState<Set<string>>(new Set());
  const [expandedSubQuestions, setExpandedSubQuestions] = useState<Set<string>>(new Set());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [rejectionNotes, setRejectionNotes] = useState<Record<string, string>>({});
  const [showRejectionModal, setShowRejectionModal] = useState<string | null>(null);
  const [processingDecisions, setProcessingDecisions] = useState<Set<string>>(new Set());

  // Fetch OASIS results
  const fetchResults = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const data = await getOasisResultsByEpisodeId(episodeId);
      setResults(data.results || []);
      setFilteredResults(data.results || []);
    } catch (err) {
      console.error('Error fetching OASIS results:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch results');
      setResults([]);
      setFilteredResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    if (episodeId) {
      fetchResults();
    }
  }, [episodeId]);

  // Filter and search logic
  useEffect(() => {
    let filtered: OasisParentGuideline[] = [];

    results.forEach(parentGuideline => {
      let matchingSubQuestions: OasisChildGuideline[] = [];
      
      // Check if parent matches search
      const parentMatches = !searchTerm.trim() || 
        parentGuideline.guideline_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (parentGuideline.title && parentGuideline.title.toLowerCase().includes(searchTerm.toLowerCase()));
      
      // Filter sub-questions based on search and status filter
      parentGuideline.sub_questions.forEach(subQuestion => {
        const subQuestionMatches = !searchTerm.trim() || 
          subQuestion.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subQuestion.guideline_id.toLowerCase().includes(searchTerm.toLowerCase());
        
        const statusMatches = currentFilter === 'all' || 
          (currentFilter === 'ai-accepted' && subQuestion.ai_decision === 'accepted') ||
          (currentFilter === 'ai-rejected' && subQuestion.ai_decision === 'rejected') ||
          (currentFilter === 'user-accepted' && subQuestion.user_decision === 'accepted') ||
          (currentFilter === 'user-rejected' && subQuestion.user_decision === 'rejected');
        
        if ((parentMatches || subQuestionMatches) && statusMatches) {
          matchingSubQuestions.push(subQuestion);
        }
      });
      
      // Include parent if it has matching sub-questions
      if (matchingSubQuestions.length > 0) {
        filtered.push({
          ...parentGuideline,
          sub_questions: matchingSubQuestions
        });
      }
    });

    setFilteredResults(filtered);
  }, [results, searchTerm, currentFilter]);

  // Handle guideline decision
  const handleGuidelineDecision = async (guidelineId: string, action: 'accept' | 'reject' | 'undo') => {
    try {
      // Validate inputs
      if (!episodeId || !guidelineId) {
        console.error('Missing required parameters:', { episodeId, guidelineId });
        setError('Missing episode or guideline ID');
        return;
      }
      
      setProcessingDecisions(prev => new Set(prev).add(guidelineId));
      
      console.log('Calling updateGuidelineDecision with:', { episodeId, guidelineId, action });
      await updateGuidelineDecision(episodeId, guidelineId, action);
      
      // Refresh results to get updated data
      await fetchResults();
    } catch (err) {
      console.error('Error updating guideline decision:', err);
      // Show error but don't crash the UI
      const errorMessage = err instanceof Error ? err.message : 'Failed to update decision';
      setError(errorMessage);
      
      // Show alert to user for better visibility
      alert(`Error: ${errorMessage}\n\nPlease check the console for more details.`);
    } finally {
      setProcessingDecisions(prev => {
        const newSet = new Set(prev);
        newSet.delete(guidelineId);
        return newSet;
      });
    }
  };

  // Handle rejection note submission
  const handleRejectionNoteSubmit = async (guidelineId: string, note: string) => {
    try {
      await submitGuidelineRejectionNote({
        episode_id: episodeId,
        guideline_id: guidelineId,
        note: note.trim(),
      });
      
      setShowRejectionModal(null);
      setRejectionNotes(prev => ({ ...prev, [guidelineId]: '' }));
      
      // Refresh results to get updated data
      await fetchResults();
    } catch (err) {
      console.error('Error submitting rejection note:', err);
      setError(err instanceof Error ? err.message : 'Failed to submit rejection note');
    }
  };

  // Handle save
  const handleSave = async () => {
    try {
      // TODO: Implement save functionality
      console.log('Saving episode:', episodeId);
      // You can add actual save logic here when the API is ready
    } catch (err) {
      console.error('Error saving episode:', err);
      setError(err instanceof Error ? err.message : 'Failed to save episode');
    }
  };

  // Toggle guideline expansion
  const toggleGuideline = (guidelineId: string) => {
    setExpandedGuidelines(prev => {
      const newSet = new Set(prev);
      if (newSet.has(guidelineId)) {
        newSet.delete(guidelineId);
      } else {
        newSet.add(guidelineId);
      }
      return newSet;
    });
  };

  // Toggle sub-question expansion
  const toggleSubQuestion = (subQuestionId: string) => {
    setExpandedSubQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(subQuestionId)) {
        newSet.delete(subQuestionId);
      } else {
        newSet.add(subQuestionId);
      }
      return newSet;
    });
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Calculate overall statistics
  const getStatsFromEpisodeData = () => {
    if (!episodeData) {
      return {
        totalQuestions: 0,
        aiAccepted: 0,
        aiPartiallyAccepted: 0,
        aiRejected: 0,
        userAccepted: 0,
        userPartiallyAccepted: 0,
        userRejected: 0,
        accuracy: '0.0',
        totalGuidelines: results.length
      };
    }

    return {
      totalQuestions: episodeData.guidelines_total || 0,
      aiAccepted: episodeData.ai_accepted || 0,
      aiPartiallyAccepted: episodeData.ai_partially_accepted || 0,
      aiRejected: episodeData.ai_rejected || 0,
      userAccepted: episodeData.user_accepted || 0,
      userPartiallyAccepted: episodeData.user_partially_accepted_rejected || 0,
      userRejected: episodeData.user_rejected || 0,
      accuracy: episodeData.accuracy ? episodeData.accuracy.toString() : '0.0',
      totalGuidelines: results.length
    };
  };

  // Calculate status for a parent guideline
  const calculateParentStatus = (parent: OasisParentGuideline) => {
    const totalQuestions = parent.sub_questions.length;
    const acceptedQuestions = parent.sub_questions.filter(sub => sub.ai_decision === 'accepted').length;
    const rejectedQuestions = parent.sub_questions.filter(sub => sub.ai_decision === 'rejected').length;

    if (acceptedQuestions === totalQuestions) {
      return { icon: CheckCircle, color: 'text-green-600', count: `${acceptedQuestions}/${totalQuestions}` };
    } else if (acceptedQuestions === 0) {
      return { icon: X, color: 'text-red-600', count: `${acceptedQuestions}/${totalQuestions}` };
    } else {
      return { icon: CheckCircle, color: 'text-orange-600', count: `${acceptedQuestions}/${totalQuestions}` };
    }
  };

  // Filter options
  const filterOptions = [
    { value: 'all', label: 'All Guidelines' },
    { value: 'ai-accepted', label: 'AI Accepted' },
    { value: 'ai-rejected', label: 'AI Rejected' },
    { value: 'user-accepted', label: 'User Accepted' },
    { value: 'user-rejected', label: 'User Rejected' },
  ];

  const currentFilterLabel = filterOptions.find(opt => opt.value === currentFilter)?.label || 'All Guidelines';

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-lg font-semibold text-gray-700">Loading OASIS Results...</p>
          <p className="text-sm text-gray-500 mt-2">Fetching guidelines for Episode ID: {episodeId}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-semibold text-gray-700 mb-2">Error Loading Results</p>
          <p className="text-sm text-gray-500 mb-4">{error}</p>
          <button
            onClick={fetchResults}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const stats = getStatsFromEpisodeData();

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-6">
        {/* Title and Overall Stats */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">OASIS Guidelines</h2>
          
          <div className="flex items-center gap-6">
            <div className="text-right">
              <div className="text-sm text-gray-600">Accuracy: {stats.accuracy}%</div>
              <div className="flex items-center gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-green-600" />
                <span>{stats.aiAccepted}</span>
                <Clock className="w-4 h-4 text-yellow-600" />
                <span>{stats.aiPartiallyAccepted}</span>
                <X className="w-4 h-4 text-red-600" />
                <span>{stats.aiRejected}</span>
                <span className="text-gray-500">{stats.totalGuidelines} of {stats.totalGuidelines} guidelines</span>
              </div>
            </div>
            
            {/* Episode Status and Lock Button */}
            <button
              onClick={handleSave}
              className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Save
            </button>
          </div>
        </div>

        {/* Statistics Grid */}
        <div className="grid grid-cols-4 gap-8 mb-6">
          {/* Row 1 - Column 1: Guidelines Total */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-sm font-medium text-gray-700">Guidelines Total: {stats.totalGuidelines}</span>
          </div>
          
          {/* Row 1 - Column 2: AI Accepted */}
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">AI Accepted: {stats.aiAccepted}</span>
          </div>
          
          {/* Row 1 - Column 3: AI Partially Accepted */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">AI Partially Accepted: {stats.aiPartiallyAccepted}</span>
          </div>
          
          {/* Row 1 - Column 4: AI Rejected */}
          <div className="flex items-center gap-2">
            <X className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-gray-700">AI Rejected: {stats.aiRejected}</span>
          </div>
          
          {/* Row 2 - Column 1: User Accepted */}
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-gray-700">User Accepted: {stats.userAccepted}</span>
          </div>
          
          {/* Row 2 - Column 2: User Partially Accepted */}
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-orange-600" />
            <span className="text-sm font-medium text-gray-700">User Partially Accepted: {stats.userPartiallyAccepted}</span>
          </div>
          
          {/* Row 2 - Column 3: User Rejected */}
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-600" />
            <span className="text-sm font-medium text-gray-700">User Rejected: {stats.userRejected}</span>
          </div>
          
          {/* Row 2 - Column 4: Empty */}
          <div></div>
        </div>

        {/* Search and Filter */}
        <div className="flex items-center gap-3">
          {/* Search Input */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search guidelines or questions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors"
            />
          </div>

          {/* Filter Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowFilterDropdown(!showFilterDropdown)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-colors bg-white"
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">{currentFilterLabel}</span>
              <ChevronRight className={`w-4 h-4 text-gray-500 transform transition-transform ${showFilterDropdown ? 'rotate-90' : ''}`} />
            </button>

            {showFilterDropdown && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowFilterDropdown(false)}
                />
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                  <div className="py-1">
                    {filterOptions.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setCurrentFilter(option.value);
                          setShowFilterDropdown(false);
                        }}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                          currentFilter === option.value
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700'
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Results Content */}
      <div className="flex-1 overflow-auto p-6">
        {filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-500">
              {results.length === 0 ? 'No guidelines found' : 'No guidelines match your filters'}
            </p>
            <p className="text-sm text-gray-400">
              {results.length === 0 
                ? `No OASIS guidelines available for Episode ${episodeId}`
                : 'Try adjusting your search or filter criteria'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredResults.map((parentGuideline) => {
              const status = calculateParentStatus(parentGuideline);
              const StatusIcon = status.icon;
              
              return (
                <div
                  key={parentGuideline.guideline_id}
                  className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Parent Guideline Header */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors flex items-center justify-between"
                    onClick={() => toggleGuideline(parentGuideline.guideline_id)}
                  >
                    <div className="flex items-center gap-3">
                      <ChevronRight 
                        className={`w-5 h-5 text-gray-400 transform transition-transform ${
                          expandedGuidelines.has(parentGuideline.guideline_id) ? 'rotate-90' : ''
                        }`} 
                      />
                      
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold text-gray-900">
                          {parentGuideline.guideline_id}
                        </span>
                        
                        <span className="text-sm text-gray-600">
                          {parentGuideline.sub_questions.length} question{parentGuideline.sub_questions.length !== 1 ? 's' : ''}
                        </span>
                        
                        {parentGuideline.title && (
                          <span className="text-sm italic text-gray-500">
                            {parentGuideline.title}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`w-5 h-5 ${status.color}`} />
                      <span className={`text-sm font-medium ${status.color}`}>
                        {status.count}
                      </span>
                    </div>
                  </div>

                  {/* Sub-Questions - Level 1 Expansion with Indentation */}
                  {expandedGuidelines.has(parentGuideline.guideline_id) && (
                    <div className="ml-6 border-l-4 border-blue-200 pl-4 bg-gray-50">
                      {parentGuideline.sub_questions.map((subQuestion, index) => (
                        <React.Fragment key={subQuestion.guideline_id}>
                          {/* Sub-question Header - Clickable */}
                          <div
                            className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-gray-100 transition-colors border-b border-gray-200"
                            onClick={() => toggleSubQuestion(subQuestion.guideline_id)}
                          >
                            {/* Left side - Sub-question info */}
                            <div className="flex items-center gap-4">
                              <span className="text-lg font-bold text-gray-700">
                                {subQuestion.guideline_id}
                              </span>
                              <span className="text-sm text-gray-500">
                                #{index + 1}
                              </span>
                              
                              {/* Status Badge */}
                              <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${
                                subQuestion.ai_decision === 'accepted' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {subQuestion.ai_decision === 'accepted' ? (
                                  <CheckCircle className="w-4 h-4" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                                <span className="text-sm font-medium">
                                  {subQuestion.ai_decision === 'accepted' ? 'Match' : 'No Match'}
                                </span>
                              </div>
                            </div>

                            {/* Right side - Collapse button */}
                            <button className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg transition-colors">
                              <span className="text-sm font-medium">
                                {expandedSubQuestions.has(subQuestion.guideline_id) ? 'Collapse' : 'Details'}
                              </span>
                              <ChevronRight 
                                className={`w-4 h-4 transform transition-transform ${
                                  expandedSubQuestions.has(subQuestion.guideline_id) ? 'rotate-90' : ''
                                }`} 
                              />
                            </button>
                          </div>

                          {/* Expanded Sub-Question Details - Inline with Indentation */}
                          {expandedSubQuestions.has(subQuestion.guideline_id) && (
                            <div className="ml-8 border-l-4 border-gray-300 pl-6 bg-white p-6 mr-4 mb-4 rounded-r-lg">
                              {/* Question */}
                              <div className="mb-6">
                                <p className="text-base text-gray-800 font-medium leading-relaxed">
                                  {subQuestion.question}
                                </p>
                              </div>

                              {/* AI Prediction and Human Coder Answers - MOVED TO TOP */}
                              <div className="grid grid-cols-2 gap-6 mb-6">
                                {/* AI Prediction */}
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                      <span className="text-blue-600 text-xs font-bold">AI</span>
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-700">AI Prediction</h4>
                                  </div>
                                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                    {subQuestion.predicted_answer ? (
                                      <div className="text-2xl font-bold text-blue-800">
                                        {Array.isArray(subQuestion.predicted_answer) 
                                          ? subQuestion.predicted_answer.join(', ')
                                          : subQuestion.predicted_answer}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500">No prediction available</div>
                                    )}
                                  </div>
                                </div>

                                {/* Human Coder */}
                                <div>
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                      <span className="text-purple-600 text-xs font-bold">HC</span>
                                    </div>
                                    <h4 className="text-sm font-semibold text-gray-700">Human Coder</h4>
                                  </div>
                                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                    {subQuestion.human_coder_answer && subQuestion.human_coder_answer.length > 0 ? (
                                      <div className="text-2xl font-bold text-purple-800">
                                        {subQuestion.human_coder_answer.join(', ')}
                                      </div>
                                    ) : (
                                      <div className="text-sm text-gray-500">No human coder answer</div>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons - MOVED TO TOP */}
                              <div className="flex items-center gap-3 mb-6">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGuidelineDecision(subQuestion.guideline_id, 'accept');
                                  }}
                                  disabled={processingDecisions.has(subQuestion.guideline_id)}
                                  className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors font-medium"
                                >
                                  {processingDecisions.has(subQuestion.guideline_id) ? (
                                    <RefreshCw className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <CheckCircle className="w-4 h-4" />
                                  )}
                                  Accept AI Prediction
                                </button>
                                
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRejectionModal(subQuestion.guideline_id);
                                  }}
                                  disabled={processingDecisions.has(subQuestion.guideline_id)}
                                  className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors font-medium"
                                >
                                  <X className="w-4 h-4" />
                                  Reject AI Prediction
                                </button>
                                
                                {subQuestion.user_decision && subQuestion.user_decision !== 'pending' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGuidelineDecision(subQuestion.guideline_id, 'undo');
                                    }}
                                    disabled={processingDecisions.has(subQuestion.guideline_id)}
                                    className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors"
                                  >
                                    <RefreshCw className="w-4 h-4" />
                                    Undo
                                  </button>
                                )}
                              </div>

                              {/* Available Options */}
                              {subQuestion.option_descriptions && subQuestion.option_descriptions.length > 0 && (
                                <div className="mb-6">
                                  <div 
                                    className="flex items-center justify-between cursor-pointer group hover:bg-gray-50 p-2 rounded-lg transition-colors"
                                    onClick={() => toggleSection(`options-${subQuestion.guideline_id}`)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`transform transition-transform ${expandedSections.has(`options-${subQuestion.guideline_id}`) ? 'rotate-90' : ''}`}>
                                        <ChevronRight className="w-5 h-5 text-blue-600" />
                                      </div>
                                      <h4 className="text-sm font-semibold text-gray-700">Available Options</h4>
                                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                        {subQuestion.option_descriptions.length} options
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Eye className="w-4 h-4 text-blue-600" />
                                      <span className="text-xs text-blue-600 font-medium group-hover:underline">
                                        {expandedSections.has(`options-${subQuestion.guideline_id}`) ? 'Hide' : 'View options'}
                                      </span>
                                    </div>
                                  </div>
                                  {expandedSections.has(`options-${subQuestion.guideline_id}`) && (
                                    <div className="mt-3 space-y-2 pl-7">
                                      {subQuestion.option_descriptions.map((option, optionIndex) => (
                                        <div key={optionIndex} className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                          <span className="font-medium text-gray-900">{option.option}:</span>
                                          <span className="ml-1">{option.description}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Instructions */}
                              {subQuestion.instructions && (
                                <div className="mb-6">
                                  {/* Special Instructions */}
                                  {subQuestion.instructions.special_instructions && (
                                    <div className="mb-4">
                                      <div 
                                        className="flex items-center justify-between cursor-pointer group hover:bg-yellow-50 p-2 rounded-lg transition-colors"
                                        onClick={() => toggleSection(`special-${subQuestion.guideline_id}`)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={`transform transition-transform ${expandedSections.has(`special-${subQuestion.guideline_id}`) ? 'rotate-90' : ''}`}>
                                            <ChevronRight className="w-5 h-5 text-yellow-600" />
                                          </div>
                                          <h4 className="text-sm font-semibold text-gray-700">Special Instructions</h4>
                                          <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
                                            Important
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Eye className="w-4 h-4 text-yellow-600" />
                                          <span className="text-xs text-yellow-600 font-medium group-hover:underline">
                                            {expandedSections.has(`special-${subQuestion.guideline_id}`) ? 'Hide' : 'View instructions'}
                                          </span>
                                        </div>
                                      </div>
                                      {expandedSections.has(`special-${subQuestion.guideline_id}`) && (
                                        <div className="mt-3 pl-7">
                                          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                              {subQuestion.instructions.special_instructions}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Coding Instructions - COLLAPSIBLE */}
                                  {subQuestion.instructions.coding_instructions && (
                                    <div className="mb-4">
                                      <div 
                                        className="flex items-center justify-between cursor-pointer group hover:bg-orange-50 p-2 rounded-lg transition-colors"
                                        onClick={() => toggleSection(`coding-${subQuestion.guideline_id}`)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={`transform transition-transform ${expandedSections.has(`coding-${subQuestion.guideline_id}`) ? 'rotate-90' : ''}`}>
                                            <ChevronRight className="w-5 h-5 text-orange-600" />
                                          </div>
                                          <h4 className="text-sm font-semibold text-gray-700">Coding Instructions</h4>
                                          <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-full font-medium">
                                            Guide
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Eye className="w-4 h-4 text-orange-600" />
                                          <span className="text-xs text-orange-600 font-medium group-hover:underline">
                                            {expandedSections.has(`coding-${subQuestion.guideline_id}`) ? 'Hide' : 'View guide'}
                                          </span>
                                        </div>
                                      </div>
                                      {expandedSections.has(`coding-${subQuestion.guideline_id}`) && (
                                        <div className="mt-3 pl-7">
                                          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                              {subQuestion.instructions.coding_instructions}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Response Specific Instructions */}
                                  {subQuestion.instructions.response_specific_instructions && (
                                    <div className="mb-4">
                                      <div 
                                        className="flex items-center justify-between cursor-pointer group hover:bg-blue-50 p-2 rounded-lg transition-colors"
                                        onClick={() => toggleSection(`response-${subQuestion.guideline_id}`)}
                                      >
                                        <div className="flex items-center gap-2">
                                          <div className={`transform transition-transform ${expandedSections.has(`response-${subQuestion.guideline_id}`) ? 'rotate-90' : ''}`}>
                                            <ChevronRight className="w-5 h-5 text-blue-600" />
                                          </div>
                                          <h4 className="text-sm font-semibold text-gray-700">Response Specific Instructions</h4>
                                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                                            Guidelines
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Eye className="w-4 h-4 text-blue-600" />
                                          <span className="text-xs text-blue-600 font-medium group-hover:underline">
                                            {expandedSections.has(`response-${subQuestion.guideline_id}`) ? 'Hide' : 'View details'}
                                          </span>
                                        </div>
                                      </div>
                                      {expandedSections.has(`response-${subQuestion.guideline_id}`) && (
                                        <div className="mt-3 pl-7">
                                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                            <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">
                                              {subQuestion.instructions.response_specific_instructions}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}


                              {/* Supporting Evidence - COLLAPSIBLE */}
                              {subQuestion.supporting_info && subQuestion.supporting_info.length > 0 && (
                                <div className="mb-6">
                                  <div 
                                    className="flex items-center justify-between cursor-pointer group hover:bg-green-50 p-2 rounded-lg transition-colors"
                                    onClick={() => toggleSection(`evidence-${subQuestion.guideline_id}`)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`transform transition-transform ${expandedSections.has(`evidence-${subQuestion.guideline_id}`) ? 'rotate-90' : ''}`}>
                                        <ChevronRight className="w-5 h-5 text-green-600" />
                                      </div>
                                      <FileText className="w-4 h-4 text-gray-600" />
                                      <h4 className="text-sm font-semibold text-gray-700">Supporting Evidence</h4>
                                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                                        {subQuestion.supporting_info.length} items
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Eye className="w-4 h-4 text-green-600" />
                                      <span className="text-xs text-green-600 font-medium group-hover:underline">
                                        {expandedSections.has(`evidence-${subQuestion.guideline_id}`) ? 'Hide' : 'View evidence'}
                                      </span>
                                    </div>
                                  </div>
                                  {expandedSections.has(`evidence-${subQuestion.guideline_id}`) && (
                                    <div className="mt-3 space-y-3 pl-7">
                                      {subQuestion.supporting_info.map((info, infoIndex) => (
                                      <div key={infoIndex} className="border-l-4 border-blue-400 bg-gray-50 p-4 rounded-r-lg">
                                        <div className="mb-3">
                                          <p className="text-sm text-gray-800 font-medium leading-relaxed">
                                            "{info.supporting_sentence_in_document}"
                                          </p>
                                        </div>
                                        <div className="flex items-center justify-between">
                                          <div className="flex items-center gap-3 text-xs text-gray-600">
                                            <div className="flex items-center gap-1">
                                              <FileText className="w-3 h-3" />
                                              <span>{info.document_name}</span>
                                            </div>
                                            <span>Page {info.page_number}</span>
                                            {info.highlight_count && (
                                              <span className="text-blue-600">
                                                {info.highlight_count} highlight{info.highlight_count !== 1 ? 's' : ''} available
                                              </span>
                                            )}
                                          </div>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              onHighlight && onHighlight(info);
                                            }}
                                            className="px-3 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors font-medium"
                                          >
                                            View
                                          </button>
                                        </div>
                                      </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* AI Reasoning - COLLAPSIBLE */}
                              {subQuestion.reasoning && (
                                <div className="mb-6">
                                  <div 
                                    className="flex items-center justify-between cursor-pointer group hover:bg-indigo-50 p-2 rounded-lg transition-colors"
                                    onClick={() => toggleSection(`reasoning-${subQuestion.guideline_id}`)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`transform transition-transform ${expandedSections.has(`reasoning-${subQuestion.guideline_id}`) ? 'rotate-90' : ''}`}>
                                        <ChevronRight className="w-5 h-5 text-indigo-600" />
                                      </div>
                                      <h4 className="text-sm font-semibold text-gray-700">AI Reasoning</h4>
                                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-medium">
                                        Explanation
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Eye className="w-4 h-4 text-indigo-600" />
                                      <span className="text-xs text-indigo-600 font-medium group-hover:underline">
                                        {expandedSections.has(`reasoning-${subQuestion.guideline_id}`) ? 'Hide' : 'View reasoning'}
                                      </span>
                                    </div>
                                  </div>
                                  {expandedSections.has(`reasoning-${subQuestion.guideline_id}`) && (
                                    <div className="mt-3 pl-7">
                                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                                        <p className="text-sm text-gray-800 leading-relaxed">
                                          {subQuestion.reasoning}
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Rejection Note - COLLAPSIBLE */}
                              {subQuestion.rejection_note && (
                                <div className="mb-6">
                                  <div 
                                    className="flex items-center justify-between cursor-pointer group hover:bg-red-50 p-2 rounded-lg transition-colors"
                                    onClick={() => toggleSection(`rejection-${subQuestion.guideline_id}`)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className={`transform transition-transform ${expandedSections.has(`rejection-${subQuestion.guideline_id}`) ? 'rotate-90' : ''}`}>
                                        <ChevronRight className="w-5 h-5 text-red-600" />
                                      </div>
                                      <h4 className="text-sm font-semibold text-gray-700">Rejection Note</h4>
                                      <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-full font-medium">
                                        Important
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Eye className="w-4 h-4 text-red-600" />
                                      <span className="text-xs text-red-600 font-medium group-hover:underline">
                                        {expandedSections.has(`rejection-${subQuestion.guideline_id}`) ? 'Hide' : 'View note'}
                                      </span>
                                    </div>
                                  </div>
                                  {expandedSections.has(`rejection-${subQuestion.guideline_id}`) && (
                                    <div className="mt-3 pl-7">
                                      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                        <p className="text-sm text-red-800">{subQuestion.rejection_note}</p>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rejection Note Modal */}
      {showRejectionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Rejection Note</h3>
              <button
                onClick={() => setShowRejectionModal(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Reason for rejection:
              </label>
              <textarea
                value={rejectionNotes[showRejectionModal] || ''}
                onChange={(e) => setRejectionNotes(prev => ({
                  ...prev,
                  [showRejectionModal]: e.target.value
                }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                rows={4}
                placeholder="Please provide a reason for rejecting this guideline..."
              />
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const note = rejectionNotes[showRejectionModal]?.trim();
                  if (note) {
                    handleRejectionNoteSubmit(showRejectionModal, note);
                  }
                }}
                disabled={!rejectionNotes[showRejectionModal]?.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                <MessageSquare className="w-4 h-4" />
                Submit Rejection
              </button>
              
              <button
                onClick={() => setShowRejectionModal(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResultsSection;