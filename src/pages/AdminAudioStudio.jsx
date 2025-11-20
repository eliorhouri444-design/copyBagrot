import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  ArrowLeft,
  Plus,
  Play,
  Pause,
  Trash2,
  Upload,
  Mic,
  Volume2,
  CheckCircle,
  XCircle,
  Clock,
  Loader2,
  Sparkles,
  Eye,
  FileText,
  Filter,
  MessageSquare,
  Edit2,
  Wand2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { generateVTTCaption } from "@/components/audio/QualityChecker";

export default function AdminAudioStudioPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isUserLoaded, setIsUserLoaded] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterLevel, setFilterLevel] = useState("all");
  const [filterSubject, setFilterSubject] = useState("all"); // NEW state
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedAudioForLink, setSelectedAudioForLink] = useState(null);
  const [playingAudio, setPlayingAudio] = useState(null);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [availableVoices, setAvailableVoices] = useState([]);
  const [showViewTextDialog, setShowViewTextDialog] = useState(false);
  const [viewingAudio, setViewingAudio] = useState(null);
  const [linkTarget, setLinkTarget] = useState('practice'); // 'practice' or 'exam'

  const [newAudio, setNewAudio] = useState({
    text: "",
    level: "B1",
    voice: "",
    speed: 0.85,
    pitch: 1.0,
    repeats: 2,
    subject: "English",
    units: 3,
    topic_id: "",
    audioFile: null,
    useTTS: true
  });
  
  const [availableTopics, setAvailableTopics] = useState([]);
  
  const [showQuestionsDialog, setShowQuestionsDialog] = useState(false);
  const [selectedAudioForQuestions, setSelectedAudioForQuestions] = useState(null);
  const [questionsInput, setQuestionsInput] = useState("");
  const [isAddingQuestions, setIsAddingQuestions] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editingAudio, setEditingAudio] = useState(null);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setIsUserLoaded(true);

        if (currentUser?.role !== 'admin') {
          navigate(createPageUrl("Home"));
        }
      } catch (error) {
        console.error("Error loading user:", error);
        setIsUserLoaded(true);
      }
    };
    loadUser();
  }, [navigate]);

  const loadVoices = () => {
    if (!window.speechSynthesis) return;

    const voices = window.speechSynthesis.getVoices();
    const englishVoices = voices.filter(v =>
      v.lang.startsWith('en') || v.lang.includes('US') || v.lang.includes('GB')
    );

    setAvailableVoices(englishVoices);

    setNewAudio(prev => {
      if (englishVoices.length > 0 && !prev.voice) {
        const defaultVoice = englishVoices.find(v => v.lang === 'en-US') || englishVoices[0];
        return { ...prev, voice: defaultVoice.name };
      }
      return prev;
    });
  };

  useEffect(() => {
    if (window.speechSynthesis) {
      loadVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices;
      }
    }
  }, []);

  useEffect(() => {
    const loadTopics = async () => {
      try {
        const topics = await base44.entities.TopicNew.filter({
          subject_id: "אנגלית",
          unit_level: newAudio.units,
          is_active: true
        });
        setAvailableTopics(topics);
      } catch (error) {
        console.error("Error loading topics:", error);
      }
    };
    loadTopics();
  }, [newAudio.units]);

  const { data: audioTexts = [] } = useQuery({
    queryKey: ['audio-texts'],
    queryFn: async () => {
      try {
        return await base44.entities.AudioText.list("-created_date", 200);
      } catch (error) {
        return [];
      }
    },
    enabled: isUserLoaded
  });

  const { data: listeningQuestions = [] } = useQuery({
    queryKey: ['listening-questions'],
    queryFn: async () => {
      try {
        return await base44.entities.PracticeQuestion.filter(
          { question_type: 'listening' },
          '-created_date',
          100
        );
      } catch (error) {
        return [];
      }
    },
    enabled: isUserLoaded
  });

  // Query for ALL exam questions (including ModuleA, ModuleB, ModuleC)
  const { data: examQuestions = [] } = useQuery({
    queryKey: ['exam-questions-with-audio'],
    queryFn: async () => {
      try {
        const allQuestions = [];

        // 1. GenericExam
        const genericExams = await base44.entities.GenericExam.list();
        genericExams.forEach(exam => {
          if (exam.questions && Array.isArray(exam.questions)) {
            exam.questions.forEach(q => {
              allQuestions.push({
                ...q,
                exam_id: exam.id,
                exam_title: exam.title,
                exam_subject: exam.subject,
                exam_type: 'generic'
              });
            });
          }
        });

        // 2. ModuleAExam
        const moduleAExams = await base44.entities.ModuleAExam.list();
        moduleAExams.forEach(exam => {
          // Listening questions
          if (exam.listening_questions && Array.isArray(exam.listening_questions)) {
            exam.listening_questions.forEach(q => {
              allQuestions.push({
                ...q,
                exam_id: exam.id,
                exam_title: exam.title,
                exam_subject: exam.subject,
                exam_type: 'moduleA',
                section: 'listening'
              });
            });
          }
        });

        // 3. ModuleBExam - usually no audio but let's check
        const moduleBExams = await base44.entities.ModuleBExam.list();
        moduleBExams.forEach(exam => {
          if (exam.grammar_questions && Array.isArray(exam.grammar_questions)) {
            exam.grammar_questions.forEach(q => {
              allQuestions.push({
                ...q,
                exam_id: exam.id,
                exam_title: exam.title,
                exam_subject: exam.subject,
                exam_type: 'moduleB',
                section: 'grammar'
              });
            });
          }
        });

        // 4. ModuleCExam
        const moduleCExams = await base44.entities.ModuleCExam.list();
        moduleCExams.forEach(exam => {
          if (exam.questions && Array.isArray(exam.questions)) {
            exam.questions.forEach(q => {
              allQuestions.push({
                ...q,
                exam_id: exam.id,
                exam_title: exam.title,
                exam_subject: exam.subject,
                exam_type: 'moduleC'
              });
            });
          }
        });

        console.log(`✅ Loaded ${allQuestions.length} exam questions from all modules`);
        return allQuestions;
      } catch (error) {
        console.error("Error loading exam questions:", error);
        return [];
      }
    },
    enabled: isUserLoaded
  });

  // Filter audio by status, level, and subject - UPDATED LOGIC
  const filteredAudioTexts = audioTexts.filter(audio => {
    const audioActualStatus = audio.status; // Can be 'approved', 'draft', 'processing', 'failed', 'done', 'pending_review'

    let matchesStatus = filterStatus === "all";
    if (filterStatus === "done") {
      matchesStatus = audioActualStatus === "approved" || audioActualStatus === "done";
    } else if (filterStatus === "pending_review") {
      matchesStatus = audioActualStatus === "draft" || audioActualStatus === "pending_review";
    } else if (filterStatus === "processing") {
      matchesStatus = audioActualStatus === "processing";
    } else if (filterStatus === "failed") {
      matchesStatus = audioActualStatus === "failed";
    }

    const levelMatch = filterLevel === "all" || audio.level === filterLevel;
    const subjectMatch = filterSubject === "all" || audio.subject === filterSubject;
    return matchesStatus && levelMatch && subjectMatch;
  });

  const createAudioMutation = useMutation({
    mutationFn: async (audioData) => {
      if (!audioData.text) {
        throw new Error("טקסט ההקלטה חובה");
      }

      if (!audioData.useTTS && !audioData.audioFile) {
        throw new Error("נדרש קובץ שמע או שימוש ב-TTS");
      }

      try {
        let audioUrl = "";
        let estimatedDuration = Math.floor(audioData.text.split(' ').length * 600 / (audioData.speed || 1));

        // Upload audio file if provided
        if (audioData.audioFile) {
          console.log("Uploading audio file:", audioData.audioFile.name);
          const { file_url } = await base44.integrations.Core.UploadFile({ file: audioData.audioFile });
          audioUrl = file_url;
          console.log("Audio file uploaded:", audioUrl);
        }

        console.log("Generating VTT caption...");
        const vttContent = generateVTTCaption(audioData.text, estimatedDuration);
        const vttBlob = new Blob([vttContent], { type: 'text/vtt' });
        const vttFile = new File([vttBlob], `caption_${Date.now()}.vtt`, { type: 'text/vtt' });
        const { file_url: vttUrl } = await base44.integrations.Core.UploadFile({ file: vttFile });
        console.log("VTT caption uploaded:", vttUrl);

        console.log("Creating AudioText entity...");
        const newAudioText = await base44.entities.AudioText.create({
          audio_text: audioData.text,
          subject_id: audioData.subject === 'English' ? 'אנגלית' : audioData.subject,
          unit_level: audioData.units,
          topic_id: audioData.topic_id || `אנגלית_${audioData.units}_listening`,
          audio_url: audioUrl,
          voice_type: audioData.voice?.toLowerCase().includes('female') ? 'female' : 'male',
          speed: audioData.speed,
          language: 'en-US',
          duration_seconds: Math.floor(estimatedDuration / 1000),
          title: audioData.text.substring(0, 50) + (audioData.text.length > 50 ? '...' : ''),
          is_active: true
        });
        
        console.log("AudioText created successfully:", newAudioText.id);
        return newAudioText;
      } catch (error) {
        console.error('Error in createAudioMutation:', error);
        throw new Error(`שגיאה ביצירת הקלטה: ${error.message}`);
      }
    },
    onSuccess: (createdAudio) => {
      queryClient.invalidateQueries({ queryKey: ['audio-texts'] });
      setShowCreateDialog(false);
      setNewAudio(prev => ({
        ...prev,
        text: "",
        level: "B1",
        voice: availableVoices[0]?.name || "",
        speed: 0.85,
        pitch: 1.0,
        repeats: 2,
        subject: "English",
        units: 3,
        topic_id: "",
        audioFile: null,
        useTTS: true
      }));
      // Open questions dialog after creation
      setSelectedAudioForQuestions(createdAudio);
      setShowQuestionsDialog(true);
    },
    onError: (error) => {
      console.error('Error creating audio:', error);
      alert('שגיאה ביצירת ההקלטה: ' + error.message);
    }
  });

  const deleteAudioMutation = useMutation({
    mutationFn: (audioId) => base44.entities.AudioText.delete(audioId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['audio-texts'] });
      alert('נמחק! ✅');
    }
  });

  const linkAudioToQuestionMutation = useMutation({
    mutationFn: async ({ audioId, questionId, targetType, examId, examType, section }) => {
      const audio = audioTexts.find(a => a.id === audioId);
      
      if (!audio) {
        throw new Error("Audio not found.");
      }

      if (targetType === 'practice') {
        // Link to practice question
        await base44.entities.PracticeQuestion.update(questionId, {
          audio_url: audio.audio_url || "",
          caption_url: audio.caption_url,
          audio_transcript: audio.text,
          audio_play_limit: audio.repeats || 2,
          tts_voice: audio.voice,
          tts_speed: audio.speed,
          tts_pitch: audio.pitch
        });
      } else if (targetType === 'exam') {
        // questionId here refers to the question_number within the exam, NOT the exam's ID.
        // examId is the ID of the exam document.

        if (!examId || !examType) {
          throw new Error("Missing examId or examType for linking to exam question.");
        }

        let updatedExamData = null;
        let examToUpdate = null;

        switch (examType) {
          case 'generic':
            examToUpdate = await base44.entities.GenericExam.get(examId);
            if (examToUpdate && examToUpdate.questions) {
              const updatedQuestions = examToUpdate.questions.map(q => {
                if (q.question_number === questionId) {
                  return {
                    ...q,
                    audio_url: audio.audio_url || "",
                    caption_url: audio.caption_url,
                    audio_transcript: audio.text,
                    audio_play_limit: audio.repeats || 2,
                    tts_voice: audio.voice,
                    tts_speed: audio.speed,
                    tts_pitch: audio.pitch
                  };
                }
                return q;
              });
              updatedExamData = { questions: updatedQuestions };
            } else {
              throw new Error(`GenericExam with ID ${examId} not found or has no questions.`);
            }
            await base44.entities.GenericExam.update(examId, updatedExamData);
            break;

          case 'moduleA':
            examToUpdate = await base44.entities.ModuleAExam.get(examId);
            if (examToUpdate && section === 'listening' && examToUpdate.listening_questions) {
              const updatedListeningQuestions = examToUpdate.listening_questions.map(q => {
                if (q.question_number === questionId) {
                  return {
                    ...q,
                    audio_url: audio.audio_url || "",
                    caption_url: audio.caption_url,
                    audio_transcript: audio.text,
                    tts_voice: audio.voice,
                    tts_speed: audio.speed,
                    tts_pitch: audio.pitch
                  };
                }
                return q;
              });
              updatedExamData = {
                listening_questions: updatedListeningQuestions,
                listening_audio_url: audio.audio_url || "",
                listening_caption_url: audio.caption_url,
                listening_transcript: audio.text
              };
            } else {
              throw new Error(`ModuleAExam with ID ${examId} not found, section mismatch, or listening questions not available.`);
            }
            await base44.entities.ModuleAExam.update(examId, updatedExamData);
            break;

          case 'moduleB':
            examToUpdate = await base44.entities.ModuleBExam.get(examId);
            if (examToUpdate && section === 'grammar' && examToUpdate.grammar_questions) {
              const updatedGrammarQuestions = examToUpdate.grammar_questions.map(q => {
                if (q.question_number === questionId) {
                  return {
                    ...q,
                    audio_url: audio.audio_url || "",
                    caption_url: audio.caption_url,
                    tts_voice: audio.voice,
                    tts_speed: audio.speed
                  };
                }
                return q;
              });
              updatedExamData = { grammar_questions: updatedGrammarQuestions };
            } else {
              throw new Error(`ModuleBExam with ID ${examId} not found, section mismatch, or grammar questions not available.`);
            }
            await base44.entities.ModuleBExam.update(examId, updatedExamData);
            break;

          case 'moduleC':
            examToUpdate = await base44.entities.ModuleCExam.get(examId);
            if (examToUpdate && examToUpdate.questions) {
              const updatedQuestions = examToUpdate.questions.map(q => {
                if (q.question_number === questionId) {
                  return {
                    ...q,
                    audio_url: audio.audio_url || "",
                    caption_url: audio.caption_url,
                    audio_transcript: audio.text,
                    tts_voice: audio.voice,
                    tts_speed: audio.speed
                  };
                }
                return q;
              });
              updatedExamData = { questions: updatedQuestions };
            } else {
              throw new Error(`ModuleCExam with ID ${examId} not found or has no questions.`);
            }
            await base44.entities.ModuleCExam.update(examId, updatedExamData);
            break;

          default:
            throw new Error(`Unknown exam type: ${examType}`);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['listening-questions'] });
      queryClient.invalidateQueries({ queryKey: ['exam-questions-with-audio'] }); // Invalidate new query
      setShowLinkDialog(false);
      setSelectedAudioForLink(null);
      alert('קושר לשאלה! ✅');
    },
    onError: (error) => { // Added error handling for mutation
      console.error('Error linking audio:', error);
      alert('שגיאה בקישור הקלטה: ' + error.message);
    }
  });

  const handleQuickPlay = (audio) => {
    if (playingAudio?.id === audio.id) {
      setPlayingAudio(null);
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    } else {
      setPlayingAudio(audio);

      if (window.speechSynthesis && audio.text) {
        try {
          // Cancel any ongoing speech
          window.speechSynthesis.cancel();

          // Wait a bit before starting new speech
          setTimeout(() => {
            try {
              const utterance = new SpeechSynthesisUtterance(audio.text);
              utterance.rate = audio.speed || 1.0;
              utterance.pitch = audio.pitch || 1.0;
              utterance.lang = 'en-US';

              const voice = availableVoices.find(v => v.name === audio.voice);
              if (voice) {
                utterance.voice = voice;
                utterance.lang = voice.lang;
              }

              utterance.onend = () => {
                setPlayingAudio(null);
              };

              utterance.onerror = (event) => {
                console.error("Speech synthesis error:", event);
                setPlayingAudio(null);

                // Show user-friendly error
                if (event.error === 'interrupted') {
                  // Silently ignore interruption errors
                  return;
                }

                alert(`שגיאה בהשמעת הקול: ${event.error}\nנסה שוב או בחר קול אחר.`);
              };

              // Check if speech synthesis is working
              if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel(); // Cancel if already speaking
                setTimeout(() => window.speechSynthesis.speak(utterance), 100); // Re-attempt after cancelling
              } else {
                window.speechSynthesis.speak(utterance);
              }
            } catch (innerError) {
              console.error('Error in utterance creation:', innerError);
              setPlayingAudio(null);
              alert('שגיאה בהשמעת הקול. נסה לרענן את הדף.');
            }
          }, 100); // Small delay to ensure cancel finishes
        } catch (error) {
          console.error('Error in handleQuickPlay:', error);
          setPlayingAudio(null);
          alert('שגיאה בהשמעת הקול. נסה לרענן את הדף.');
        }
      } else {
        setPlayingAudio(null);
        alert('אין תמיכה ב-Speech Synthesis בדפדפן זה.');
      }
    }
  };

  const handlePreviewVoice = () => {
    if (previewingVoice) {
      window.speechSynthesis.cancel();
      setPreviewingVoice(false);
      return;
    }

    if (!newAudio.text) {
      alert('אנא כתוב טקסט לפני השמעת דוגמה');
      return;
    }

    // Check text length
    if (newAudio.text.length > 500) {
      alert('הטקסט ארוך מדי לדוגמה. נסה טקסט קצר יותר (עד 500 תווים).');
      return;
    }

    if (availableVoices.length === 0) {
      loadVoices();
      setTimeout(() => {
        if (availableVoices.length === 0) {
          alert('טוען קולות... נסה שוב בעוד שנייה');
          return;
        }
        handlePreviewVoice();
      }, 500);
      return;
    }

    if (!window.speechSynthesis) {
      alert('אין תמיכה ב-Speech Synthesis בדפדפן זה.');
      return;
    }

    setPreviewingVoice(true);

    try {
      // Cancel any ongoing speech
      window.speechSynthesis.cancel();

      setTimeout(() => {
        try {
          const utterance = new SpeechSynthesisUtterance(newAudio.text);
          utterance.rate = newAudio.speed || 1.0;
          utterance.pitch = newAudio.pitch || 1.0;
          utterance.lang = 'en-US';
          utterance.volume = 1.0;

          const voice = availableVoices.find(v => v.name === newAudio.voice);
          if (voice) {
            utterance.voice = voice;
            utterance.lang = voice.lang;
          }

          utterance.onstart = () => {
            console.log('Speech started');
          };

          utterance.onend = () => {
            console.log('Speech ended');
            setPreviewingVoice(false);
          };

          utterance.onerror = (event) => {
            console.error('Speech synthesis error during preview:', event);
            setPreviewingVoice(false);

            // Handle specific errors
            if (event.error === 'interrupted') {
              // Silently ignore interruption
              return;
            }

            if (event.error === 'network') {
              alert('שגיאת רשת. וודא שיש חיבור לאינטרנט.');
              return;
            }

            if (event.error === 'synthesis-failed') {
              alert('הסינתזה נכשלה. נסה קול אחר או טקסט קצר יותר.');
              return;
            }

            if (event.error === 'audio-busy') {
              alert('מערכת השמע תפוסה. המתן מעט ונסה שוב.');
              return;
            }

            // Try with default voice as fallback if specific voice failed
            if (voice && utterance.voice && utterance.voice.name !== (availableVoices[0]?.name || '')) {
              console.log('Trying fallback with default voice');
              const fallbackUtterance = new SpeechSynthesisUtterance(newAudio.text);
              fallbackUtterance.rate = newAudio.speed || 1.0;
              fallbackUtterance.pitch = newAudio.pitch || 1.0;
              fallbackUtterance.lang = 'en-US';
              fallbackUtterance.volume = 1.0;

              // Optionally set a default voice explicitly if availableVoices has one
              const defaultVoice = availableVoices.find(v => v.lang === 'en-US') || availableVoices[0];
              if (defaultVoice) {
                fallbackUtterance.voice = defaultVoice;
                fallbackUtterance.lang = defaultVoice.lang;
              }


              fallbackUtterance.onend = () => {
                setPreviewingVoice(false);
              };

              fallbackUtterance.onerror = (fallbackEvent) => {
                console.error('Fallback speech synthesis error:', fallbackEvent);
                setPreviewingVoice(false);
                alert(`שגיאה בהשמעת הדוגמה (גם בגיבוי): ${fallbackEvent.error}\nנסה לרענן את הדף או בחר קול אחר.`);
              };

              window.speechSynthesis.speak(fallbackUtterance);
            } else {
              alert(`שגיאה בהשמעת הדוגמה: ${event.error}\nנסה לרענן את הדף או בחר קול אחר.`);
            }
          };

          // Check if speech synthesis is available and not busy, then speak
          if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
            console.log('Speech synthesis is busy, cancelling...');
            window.speechSynthesis.cancel();
            setTimeout(() => {
              window.speechSynthesis.speak(utterance);
            }, 100);
          } else {
            window.speechSynthesis.speak(utterance);
          }
        } catch (innerError) {
          console.error('Error in utterance creation during preview:', innerError);
          setPreviewingVoice(false);
          alert('שגיאה בהשמעת הדוגמה. נסה לרענן את הדף.');
        }
      }, 150); // Small delay after cancel

    } catch (error) {
      console.error('Error in handlePreviewVoice:', error);
      setPreviewingVoice(false);
      alert('שגיאה בהשמעת הדוגמה. נסה לרענן את הדף.');
    }
  };

  const handleViewText = (audio) => {
    setViewingAudio(audio);
    setShowViewTextDialog(true);
  };

  // getStatusIcon - UPDATED to handle new filter options and existing data
  const getStatusIcon = (status) => {
    if (status === 'approved' || status === 'done') return <CheckCircle className="w-5 h-5 text-green-600" />;
    if (status === 'processing') return <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />;
    if (status === 'failed') return <XCircle className="w-5 h-5 text-red-600" />;
    if (status === 'draft' || status === 'pending_review') return <Clock className="w-5 h-5 text-gray-400" />;
    return <Clock className="w-5 h-5 text-gray-400" />; // Default for unknown statuses
  };

  // getStatusColor - UPDATED to handle new filter options and existing data
  const getStatusColor = (status) => {
    if (status === 'approved' || status === 'done') return "bg-green-50 text-green-700 border-green-200";
    if (status === 'processing') return "bg-blue-50 text-blue-700 border-blue-200";
    if (status === 'failed') return "bg-red-50 text-red-700 border-red-200";
    if (status === 'draft' || status === 'pending_review') return "bg-gray-50 text-gray-700 border-gray-200";
    return "bg-gray-50 text-gray-700 border-gray-200"; // Default for unknown statuses
  };

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-purple-50 pb-24">
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-b-[2rem] p-6 shadow-xl mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl("AdminExams"))}
          className="text-white hover:bg-white/20 mb-4"
        >
          <ArrowLeft className="w-6 h-6" />
        </Button>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center">
            <Volume2 className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white mb-1">🎙️ Audio Studio</h1>
            <p className="text-white/80">ניהול קטעי האזנה מתקדם</p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-blue-600" />
            <div className="flex-1">
              <div className="font-bold text-gray-900">מערכת TTS מתקדמת 🎤</div>
              <div className="text-sm text-gray-600">
                {availableVoices.length} קולות זמינים • עובד ללא אינטרנט • מהירות וגובה קול מתכווננים
              </div>
              <div className="text-xs text-amber-600 mt-1">
                💡 טיפ: אם הקול לא עובד, נסה לרענן את הדף או בחר קול אחר
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="h-14 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold"
          >
            <Plus className="w-5 h-5 mr-2" />
            הוסף הקלטה
          </Button>

          <Button
            onClick={() => {
              const stats = {
                total: audioTexts.length,
                approved: audioTexts.filter(a => a.status === 'approved' || a.status === 'done').length, // Updated to include 'done'
                voices: new Set(audioTexts.map(a => a.voice)).size
              };
              alert(`📊 סטטיסטיקה:\n\n• סה"כ הקלטות: ${stats.total}\n• מאושרות: ${stats.approved}\n• קולות שונים: ${stats.voices}\n• עובדות ללא אינטרנט: ${stats.approved} ✅`);
            }}
            variant="outline"
            className="h-14 border-2 border-blue-300 text-blue-600 font-bold"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            סטטיסטיקה
          </Button>
        </div>

        {/* Filters - IMPROVED */}
        <div className="max-w-7xl mx-auto px-6 mb-6">
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-semibold text-gray-700">סינון:</span>
              </div>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="סטטוס" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הסטטוסים</SelectItem>
                  <SelectItem value="done">✅ מוכן</SelectItem>
                  <SelectItem value="processing">⚙️ בתהליך</SelectItem>
                  <SelectItem value="failed">❌ נכשל</SelectItem>
                  <SelectItem value="pending_review">👀 ממתין לבדיקה</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterLevel} onValueChange={setFilterLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="רמה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הרמות</SelectItem>
                  <SelectItem value="A2">A2</SelectItem>
                  <SelectItem value="B1">B1</SelectItem>
                  <SelectItem value="B2">B2</SelectItem>
                  <SelectItem value="C1">C1</SelectItem>
                </SelectContent>
              </Select>

              {/* NEW: Subject Filter */}
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="מקצוע" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל המקצועות</SelectItem>
                  <SelectItem value="English">🇬🇧 אנגלית</SelectItem>
                  <SelectItem value="Mathematics">🔢 מתמטיקה</SelectItem>
                  <SelectItem value="Physics">⚛️ פיזיקה</SelectItem>
                  <SelectItem value="Literature">📚 ספרות</SelectItem>
                  <SelectItem value="History">🏛️ היסטוריה</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <div className="text-sm text-gray-600">
                מציג <strong className="text-purple-600">{filteredAudioTexts.length}</strong> מתוך {audioTexts.length}
              </div>
            </div>
          </div>
        </div>

        {/* Table - use filteredAudioTexts instead of audioTexts */}
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-purple-50 to-pink-50">
                  <TableHead className="text-right font-bold">סטטוס</TableHead>
                  <TableHead className="text-right font-bold">טקסט</TableHead>
                  <TableHead className="text-right font-bold">רמה</TableHead>
                  <TableHead className="text-right font-bold">קול</TableHead>
                  <TableHead className="text-right font-bold">מקצוע</TableHead> {/* NEW TableHead for Subject */}
                  <TableHead className="text-right font-bold">פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAudioTexts.map((audio) => (
                  <TableRow key={audio.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full border ${getStatusColor(audio.status)}`}>
                        {getStatusIcon(audio.status)}
                        <span className="text-xs font-semibold">
                          {(audio.status === 'approved' || audio.status === 'done') ? 'מוכן' :
                          (audio.status === 'processing') ? 'בתהליך' :
                          (audio.status === 'failed') ? 'נכשל' :
                          (audio.status === 'draft' || audio.status === 'pending_review') ? 'ממתין' :
                          audio.status} {/* Display appropriate Hebrew status */}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-gray-900 truncate">{audio.text}</div>
                      <div className="text-xs text-green-600 mt-1">🎤 TTS • עובד ללא אינטרנט ✓</div>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                        {audio.level}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-gray-600">{audio.voice}</span>
                    </TableCell>
                    <TableCell> {/* NEW TableCell for Subject */}
                      <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                        {audio.subject}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {(audio.status === 'approved' || audio.status === 'done') && audio.text && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewText(audio)}
                              className="text-indigo-600"
                              title="צפה בטקסט המלא"
                            >
                              <Eye className="w-4 h-4" />
                            </Button>

                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleQuickPlay(audio)}
                              className={playingAudio?.id === audio.id ? 'text-green-600' : 'text-blue-600'}
                              title="שמע"
                            >
                              {playingAudio?.id === audio.id ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>

                            <Button
                             variant="ghost"
                             size="icon"
                             onClick={() => {
                               setSelectedAudioForLink(audio);
                               setShowLinkDialog(true);
                             }}
                             className="text-purple-600"
                             title="קשר לשאלה"
                            >
                             <Upload className="w-4 h-4" />
                            </Button>

                            <Button
                             variant="ghost"
                             size="icon"
                             onClick={() => {
                               setEditingAudio(audio);
                               setShowEditDialog(true);
                             }}
                             className="text-indigo-600"
                             title="ערוך"
                            >
                             <Edit2 className="w-4 h-4" />
                            </Button>
                            </>
                            )}

                            <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                            if (confirm('מחק?')) {
                             deleteAudioMutation.mutate(audio.id);
                            }
                            }}
                            className="text-red-600"
                            >
                            <Trash2 className="w-4 h-4" />
                            </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredAudioTexts.length === 0 && (
              <div className="text-center py-12">
                <Mic className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">אין הקלטות</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">צור הקלטה חדשה</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-4">
              <div className="flex gap-3 mb-3">
                <Button
                  onClick={() => setNewAudio({ ...newAudio, useTTS: true, audioFile: null })}
                  className={newAudio.useTTS ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}
                >
                  <Mic className="w-4 h-4 mr-2" />
                  TTS אוטומטי
                </Button>
                <Button
                  onClick={() => setNewAudio({ ...newAudio, useTTS: false })}
                  className={!newAudio.useTTS ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  העלה קובץ שמע
                </Button>
              </div>
            </div>

            {!newAudio.useTTS && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  קובץ שמע (MP3, WAV)
                </label>
                <input
                  type="file"
                  accept="audio/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewAudio({ ...newAudio, audioFile: file });
                    }
                  }}
                  className="w-full"
                />
                {newAudio.audioFile && (
                  <div className="text-xs text-green-600 mt-2">
                    ✓ {newAudio.audioFile.name}
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                טקסט ההקלטה (transcript)
              </label>
              <Textarea
                value={newAudio.text}
                onChange={(e) => setNewAudio({ ...newAudio, text: e.target.value })}
                placeholder="Please open your books to page fourteen."
                className="h-24"
              />
              <div className="text-xs text-gray-500 mt-1">
                {newAudio.text.split(' ').length} מילים • ~{Math.floor(newAudio.text.split(' ').length * 0.6 / (newAudio.speed || 1))}s
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  רמת קושי
                </label>
                <Select value={newAudio.level} onValueChange={(v) => setNewAudio({ ...newAudio, level: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A2">A2 - בסיסי</SelectItem>
                    <SelectItem value="B1">B1 - בינוני</SelectItem>
                    <SelectItem value="B2">B2 - מתקדם</SelectItem>
                    <SelectItem value="C1">C1 - גבוה</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  יחידות
                </label>
                <Select value={newAudio.units.toString()} onValueChange={(v) => setNewAudio({ ...newAudio, units: parseInt(v) })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3">3 יחידות</SelectItem>
                    <SelectItem value="4">4 יחידות</SelectItem>
                    <SelectItem value="5">5 יחידות</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                🎯 נושא תרגול (חובה)
              </label>
              <Select value={newAudio.topic_id} onValueChange={(v) => setNewAudio({ ...newAudio, topic_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="בחר נושא" />
                </SelectTrigger>
                <SelectContent>
                  {availableTopics.map((topic) => (
                    <SelectItem key={topic.topic_id} value={topic.topic_id}>
                      {topic.icon} {topic.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {availableTopics.length === 0 && (
                <div className="text-xs text-amber-600 mt-1">
                  ⚠️ אין נושאים ל-{newAudio.units} יחידות. צור נושא תחילה בדף התרגול.
                </div>
              )}
            </div>

            {newAudio.useTTS && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  קול ({availableVoices.length} זמינים)
                </label>
                <Select value={newAudio.voice} onValueChange={(v) => setNewAudio({ ...newAudio, voice: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="בחר קול" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[300px]">
                    {availableVoices.map((voice) => (
                      <SelectItem key={voice.name} value={voice.name}>
                        {voice.lang.includes('en-US') ? '🇺🇸' : voice.lang.includes('en-GB') ? '🇬🇧' : '🌐'} {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {newAudio.useTTS && (
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    מהירות ({newAudio.speed}x)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.05"
                    value={newAudio.speed}
                    onChange={(e) => setNewAudio({ ...newAudio, speed: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>איטי</span>
                    <span>מהיר</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    גובה קול ({newAudio.pitch}x)
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={newAudio.pitch}
                    onChange={(e) => setNewAudio({ ...newAudio, pitch: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>נמוך</span>
                    <span>גבוה</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    חזרות
                  </label>
                  <Select
                    value={newAudio.repeats.toString()}
                    onValueChange={(v) => setNewAudio({ ...newAudio, repeats: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1</SelectItem>
                      <SelectItem value="2">2 ⭐</SelectItem>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="99">∞</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {newAudio.useTTS && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 mb-1">🎤 תצוגה מקדימה</div>
                    <div className="text-sm text-gray-600">שמע איך ההקלטה תישמע</div>
                  </div>
                  <Button
                    onClick={handlePreviewVoice}
                    disabled={!newAudio.text}
                    variant="outline"
                    className="flex-shrink-0"
                  >
                    {previewingVoice ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        עצור
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        שמע דוגמה
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              ביטול
            </Button>
            <Button
              onClick={() => createAudioMutation.mutate(newAudio)}
              disabled={!newAudio.text || !newAudio.topic_id || (!newAudio.useTTS && !newAudio.audioFile) || createAudioMutation.isPending}
              className="bg-purple-600"
            >
              {createAudioMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  יוצר...
                </>
              ) : (
                'צור הקלטה'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Text Dialog */}
      <Dialog open={showViewTextDialog} onOpenChange={setShowViewTextDialog}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-600" />
              צפייה בטקסט המלא
            </DialogTitle>
          </DialogHeader>

          {viewingAudio && (
            <div className="space-y-4 py-4">
              <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-4">
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">רמה</div>
                    <div className="font-bold text-indigo-600">{viewingAudio.level}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">קול</div>
                    <div className="font-bold text-gray-900 truncate">{viewingAudio.voice}</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">מהירות</div>
                    <div className="font-bold text-gray-900">{viewingAudio.speed}x</div>
                  </div>
                  <div className="bg-white rounded-lg p-3">
                    <div className="text-xs text-gray-600 mb-1">חזרות</div>
                    <div className="font-bold text-gray-900">{viewingAudio.repeats}</div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4">
                  <div className="font-semibold text-indigo-900 mb-2">📝 הטקסט:</div>
                  <div className="text-gray-800 leading-relaxed whitespace-pre-wrap" dir="ltr">
                    {viewingAudio.text}
                  </div>
                  <div className="mt-3 pt-3 border-t border-indigo-200 text-sm text-gray-600">
                    {viewingAudio.text.split(' ').length} מילים • ~{Math.floor(viewingAudio.text.split(' ').length * 0.6 / (viewingAudio.speed || 1))} שניות
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => handleQuickPlay(viewingAudio)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  {playingAudio?.id === viewingAudio.id ? (
                    <>
                      <Pause className="w-4 h-4 mr-2" />
                      עצור
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      שמע הקלטה
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewTextDialog(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Link Dialog - IMPROVED with exam support */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent dir="rtl" className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">קשר הקלטה לשאלה</DialogTitle>
          </DialogHeader>

          {selectedAudioForLink && (
            <div className="space-y-4 py-4">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="font-semibold text-purple-900 mb-2">🎤 ההקלטה שנבחרה:</div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-gray-900 mb-2" dir="ltr">{selectedAudioForLink.text}</div>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                      {selectedAudioForLink.level}
                    </span>
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                      {selectedAudioForLink.repeats} חזרות
                    </span>
                    <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                      {selectedAudioForLink.speed}x מהירות
                    </span>
                  </div>
                </div>
              </div>

              {/* NEW: Toggle between practice and exam questions */}
              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => setLinkTarget('practice')}
                  className={linkTarget === 'practice' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700'}
                >
                  תרגולים ({listeningQuestions.length})
                </Button>
                <Button
                  onClick={() => setLinkTarget('exam')}
                  className={linkTarget === 'exam' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700'}
                >
                  מבחנים ({examQuestions.length})
                </Button>
              </div>

              <div>
                <div className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-purple-600" />
                  בחר שאלה לקישור:
                </div>

                {linkTarget === 'practice' ? (
                  listeningQuestions.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {listeningQuestions.map((question) => (
                        <button
                          key={question.id}
                          onClick={() => {
                            if (confirm(`✅ קשר הקלטה זו לשאלה?\n\nהשאלה:\n${question.question_text}`)) {
                              linkAudioToQuestionMutation.mutate({
                                audioId: selectedAudioForLink.id,
                                questionId: question.id,
                                targetType: 'practice'
                              });
                            }
                          }}
                          className="w-full text-right p-4 rounded-xl border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                                  שאלה #{question.id.slice(0, 8)}
                                </span>
                                {question.audio_transcript && (
                                  <span className="flex items-center gap-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                                    <CheckCircle className="w-3 h-3" />
                                    יש הקלטה
                                  </span>
                                )}
                              </div>

                              <div className="font-semibold text-gray-900 mb-2" dir="ltr">
                                {question.question_text}
                              </div>

                              {question.audio_transcript && (
                                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                                  <div className="text-xs font-semibold text-green-900 mb-1">📝 תמלול קיים:</div>
                                  <div className="text-xs text-green-800" dir="ltr">
                                    {question.audio_transcript.length > 150
                                      ? question.audio_transcript.substring(0, 150) + '...'
                                      : question.audio_transcript}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 flex-wrap">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                                  {question.subject}
                                </span>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">
                                  {question.units} יח'
                                </span>
                                {question.topic && (
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                    {question.topic}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0"
                            >
                              קשר →
                            </Button>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <p className="text-gray-600">אין שאלות Listening בתרגולים</p>
                    </div>
                  )
                ) : (
                  // Exam Questions - NOW WITH ALL MODULES!
                  examQuestions.length > 0 ? (
                    <div className="max-h-96 overflow-y-auto space-y-3">
                      {examQuestions.map((question) => (
                        <button
                          key={`${question.exam_type}-${question.exam_id}-${question.question_number}-${question.section || ''}`}
                          onClick={() => {
                            if (confirm(`✅ קשר הקלטה זו לשאלה במבחן?\n\nמבחן: ${question.exam_title} (${question.exam_type}${question.section ? `, ${question.section}` : ''})\nשאלה: ${question.question_text}`)) {
                              linkAudioToQuestionMutation.mutate({
                                audioId: selectedAudioForLink.id,
                                questionId: question.question_number,
                                targetType: 'exam',
                                examId: question.exam_id, // Pass exam_id here
                                examType: question.exam_type,
                                section: question.section
                              });
                            }
                          }}
                          className="w-full text-right p-4 rounded-xl border-2 border-gray-200 hover:border-green-400 hover:bg-green-50 transition-all"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">
                                  📝 {question.exam_title}
                                </span>
                                <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full font-bold">
                                  שאלה #{question.question_number}
                                </span>
                                <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-bold">
                                  {question.exam_type === 'moduleA' ? 'Module A' :
                                   question.exam_type === 'moduleB' ? 'Module B' :
                                   question.exam_type === 'moduleC' ? 'Module C' : 'Generic'}
                                </span>
                                {question.section && (
                                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
                                    {question.section}
                                  </span>
                                )}
                                {question.audio_transcript && (
                                  <span className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded-full font-bold">
                                    <CheckCircle className="w-3 h-3" />
                                    יש הקלטה
                                  </span>
                                )}
                              </div>

                              <div className="font-semibold text-gray-900 mb-2" dir="ltr">
                                {question.question_text}
                              </div>

                              {question.audio_transcript && (
                                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                                  <div className="text-xs font-semibold text-amber-900 mb-1">📝 תמלול קיים:</div>
                                  <div className="text-xs text-amber-800" dir="ltr">
                                    {question.audio_transcript.length > 100
                                      ? question.audio_transcript.substring(0, 100) + '...'
                                      : question.audio_transcript}
                                  </div>
                                </div>
                              )}

                              <div className="flex gap-2 flex-wrap">
                                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                                  {question.exam_subject}
                                </span>
                                {question.topic && (
                                  <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                                    {question.topic}
                                  </span>
                                )}
                              </div>
                            </div>

                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-shrink-0"
                            >
                              קשר →
                            </Button>
                          </div>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-gray-50 rounded-xl">
                      <p className="text-gray-600">אין שאלות במבחנים</p>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowLinkDialog(false);
              setSelectedAudioForLink(null);
            }}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">ערוך הקלטה</DialogTitle>
          </DialogHeader>

          {editingAudio && (
            <div className="space-y-4 py-4">
              {/* Play Audio */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Volume2 className="w-6 h-6 text-indigo-600" />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900">שמע את ההקלטה</div>
                    <div className="text-sm text-gray-600">הקטע הנוכחי</div>
                  </div>
                  <Button
                    onClick={() => handleQuickPlay(editingAudio)}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    {playingAudio?.id === editingAudio.id ? (
                      <>
                        <Pause className="w-4 h-4 mr-2" />
                        עצור
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        שמע
                      </>
                    )}
                  </Button>
                </div>
                <div className="bg-white rounded-lg p-3 text-sm text-gray-700" dir="ltr">
                  {editingAudio.audio_text || editingAudio.text}
                </div>
              </div>

              {/* Subject, Units and Topic Selection */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">יחידות</label>
                  <Select 
                    value={(editingAudio.unit_level || editingAudio.units)?.toString()} 
                    onValueChange={(v) => setEditingAudio({ ...editingAudio, unit_level: parseInt(v), units: parseInt(v) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3 יחידות</SelectItem>
                      <SelectItem value="4">4 יחידות</SelectItem>
                      <SelectItem value="5">5 יחידות</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">מקצוע</label>
                  <Select 
                    value={editingAudio.subject_id || editingAudio.subject} 
                    onValueChange={(v) => setEditingAudio({ ...editingAudio, subject_id: v, subject: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="אנגלית">אנגלית</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  🎯 נושא תרגול
                </label>
                <div className="text-xs text-blue-600 mb-2">
                  {editingAudio.topic_id ? `✓ ${editingAudio.topic_id}` : 'לא הוגדר'}
                </div>
                <div className="text-xs text-gray-500">
                  השאלות שתיצור יתווספו לנושא שמשויך להקלטה
                </div>
              </div>

              {/* Generate Questions with AI */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                  <Wand2 className="w-6 h-6 text-purple-600" />
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 mb-1">יצירת שאלות אוטומטית</div>
                    <div className="text-sm text-gray-600">AI ייצור 10 שאלות + תשובות מהקטע</div>
                  </div>
                  <Button
                    onClick={async () => {
                      if (!confirm('ליצור 10 שאלות מהקטע הזה?')) return;
                      
                      setIsGeneratingQuestions(true);
                      try {
                        const audioText = editingAudio.audio_text || editingAudio.text;
                        const audioUnits = editingAudio.unit_level || editingAudio.units;

                        const generated = await base44.integrations.Core.InvokeLLM({
                          prompt: `Generate 10 listening comprehension questions based on this audio text:

"${audioText}"

Rules:
- Create varied question types (details, main idea, inference, vocabulary)
- Questions should test understanding of the spoken content
- Provide short, accurate answers (1-3 words or short phrase)
- Make questions suitable for Israeli high school English level (${audioUnits} units)
- Order from easiest to hardest

Return in this EXACT format:
Question | Answer
Question | Answer
(continue for 10 questions)`,
                          response_json_schema: {
                            type: "object",
                            properties: {
                              questions: {
                                type: "array",
                                items: {
                                  type: "object",
                                  properties: {
                                    question: { type: "string" },
                                    answer: { type: "string" }
                                  }
                                }
                              }
                            }
                          }
                        });

                        // Convert to text format
                        const generatedText = generated.questions
                          .map(q => `${q.question} | ${q.answer}`)
                          .join('\n');

                        setQuestionsInput(generatedText);
                        setSelectedAudioForQuestions(editingAudio);
                        setShowEditDialog(false);
                        setShowQuestionsDialog(true);
                      } catch (error) {
                        alert('שגיאה ביצירת שאלות: ' + error.message);
                      } finally {
                        setIsGeneratingQuestions(false);
                      }
                    }}
                    disabled={isGeneratingQuestions}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {isGeneratingQuestions ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        יוצר...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4 mr-2" />
                        צור שאלות
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Manual Questions Input */}
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare className="w-5 h-5 text-yellow-700" />
                  <div className="font-bold text-gray-900">או הוסף שאלות ידנית</div>
                </div>
                <Button
                  onClick={() => {
                    setSelectedAudioForQuestions(editingAudio);
                    setShowEditDialog(false);
                    setShowQuestionsDialog(true);
                  }}
                  variant="outline"
                  className="w-full border-yellow-400"
                >
                  <MessageSquare className="w-4 h-4 mr-2" />
                  הוסף שאלות ידנית
                </Button>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button 
              onClick={async () => {
                try {
                  await base44.entities.AudioText.update(editingAudio.id, {
                    unit_level: editingAudio.unit_level || editingAudio.units,
                    subject_id: editingAudio.subject_id || editingAudio.subject,
                    topic_id: editingAudio.topic_id
                  });
                  queryClient.invalidateQueries({ queryKey: ['audio-texts'] });
                  setShowEditDialog(false);
                  alert('ההקלטה עודכנה! ✅');
                } catch (error) {
                  alert('שגיאה בעדכון: ' + error.message);
                }
              }}
              className="bg-green-600 hover:bg-green-700"
            >
              שמור שינויים
            </Button>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>
              סגור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Questions Dialog */}
      <Dialog open={showQuestionsDialog} onOpenChange={setShowQuestionsDialog}>
        <DialogContent dir="rtl" className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">הוסף שאלות לקטע האזנה</DialogTitle>
          </DialogHeader>

          {selectedAudioForQuestions && (
            <div className="space-y-4 py-4">
              <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4">
                <div className="font-semibold text-purple-900 mb-2">🎧 הקטע:</div>
                <div className="bg-white rounded-lg p-3">
                  <div className="text-sm text-gray-900 mb-2" dir="ltr">
                    {selectedAudioForQuestions.audio_text?.substring(0, 150) || selectedAudioForQuestions.text?.substring(0, 150)}...
                  </div>
                  <div className="flex gap-2 text-xs mb-3">
                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      {selectedAudioForQuestions.unit_level || selectedAudioForQuestions.units} יחידות
                    </span>
                  </div>
                  <Button
                    onClick={() => {
                      const textToSpeak = selectedAudioForQuestions.audio_text || selectedAudioForQuestions.text;
                      if (window.speechSynthesis && textToSpeak) {
                        window.speechSynthesis.cancel();
                        const utterance = new SpeechSynthesisUtterance(textToSpeak);
                        utterance.rate = selectedAudioForQuestions.speed || 1.0;
                        utterance.lang = 'en-US';
                        window.speechSynthesis.speak(utterance);
                      }
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    שמע את ההקלטה
                  </Button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  הדבק שאלות (פורמט: שאלה | תשובה)
                </label>
                <Textarea
                  value={questionsInput}
                  onChange={(e) => setQuestionsInput(e.target.value)}
                  placeholder="What did the speaker mention first? | Books&#10;How many students were there? | Fifteen&#10;What time was mentioned? | 2 PM"
                  className="min-h-[300px] font-mono text-sm"
                  dir="ltr"
                />
                <div className="text-xs text-gray-500 mt-1">
                  {questionsInput.split('\n').filter(l => l.trim() && l.includes('|')).length} שאלות
                </div>
              </div>

              <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                <div className="text-sm font-semibold text-green-900 mb-1">📝 הדרכה</div>
                <div className="text-xs text-green-700">
                  כל שורה = שאלה אחת. פורמט: "שאלה | תשובה"
                  <br />
                  השאלות יישמרו עם קישור לקטע האזנה הזה
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowQuestionsDialog(false);
              setQuestionsInput("");
            }}>
              ביטול
            </Button>
            <Button
              onClick={async () => {
                if (!questionsInput.trim()) {
                  alert("אנא הזן שאלות");
                  return;
                }

                setIsAddingQuestions(true);
                try {
                  const lines = questionsInput.split('\n').filter(l => l.trim() && l.includes('|'));
                  
                  if (lines.length === 0) {
                    alert("לא נמצאו שאלות בפורמט הנכון");
                    return;
                  }

                  const audioUnits = selectedAudioForQuestions.unit_level || selectedAudioForQuestions.units;
                  const audioText = selectedAudioForQuestions.audio_text || selectedAudioForQuestions.text;
                  const audioTopicId = selectedAudioForQuestions.topic_id;

                  if (!audioTopicId) {
                    alert("אין topic_id לאודיו הזה. אנא ערוך את ההקלטה ובחר נושא.");
                    return;
                  }

                  let counter = 1;
                  for (const line of lines) {
                    const [questionText, answer] = line.split('|').map(s => s.trim());
                    if (!questionText || !answer) continue;

                    const timestamp = Date.now() + counter;
                    const questionId = `אנגלית_${audioUnits}_listening_${counter}_${timestamp}`;

                    await base44.entities.QuestionBank.create({
                      question_id: questionId,
                      subject_id: "אנגלית",
                      unit_level: audioUnits,
                      topic_id: audioTopicId,
                      question_text: questionText,
                      question_type: "open",
                      max_score: 10,
                      difficulty_level: "medium",
                      reading_text: audioText,
                      origin_type: "teacher_custom",
                      is_active: true
                    });

                    await base44.entities.SolutionBank.create({
                      question_id: questionId,
                      solution_text: answer,
                      final_answers: [{ part_id: "main", value: answer }],
                      verified: false
                    });

                    counter++;
                    
                    // Limit to max 10 questions per set
                    if (counter > 10) break;
                  }

                  // Get topic name for display
                  const topicForDisplay = availableTopics.find(t => t.topic_id === audioTopicId);
                  alert(`✅ ${Math.min(lines.length, 10)} שאלות נוספו לנושא "${topicForDisplay?.name || audioTopicId}"!`);
                  setShowQuestionsDialog(false);
                  setQuestionsInput("");
                  setSelectedAudioForQuestions(null);
                  queryClient.invalidateQueries({ queryKey: ['listening-questions'] });
                } catch (error) {
                  console.error("Error adding questions:", error);
                  alert("שגיאה בהוספת שאלות: " + error.message);
                } finally {
                  setIsAddingQuestions(false);
                }
              }}
              disabled={!questionsInput.trim() || isAddingQuestions}
              className="bg-green-600 hover:bg-green-700"
            >
              {isAddingQuestions ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  מוסיף...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 mr-2" />
                  הוסף שאלות
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}