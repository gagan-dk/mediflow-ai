import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  ArrowRight, 
  Info, 
  Copy, 
  ThumbsUp, 
  ThumbsDown, 
  Check, 
  Download, 
  Sparkles, 
  ShieldAlert, 
  Bookmark,
  Share2,
  RefreshCw,
  ExternalLink
} from 'lucide-react';

interface AskMediFlashPageProps {
  navigate: (path: string) => void;
}

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  points?: string[];
  guidanceNote?: string;
  sources?: string[];
  liked?: boolean;
  disliked?: boolean;
  saved?: boolean;
}

export const AskMediFlashPage: React.FC<AskMediFlashPageProps> = ({ navigate }) => {
  const [conversationTitle, setConversationTitle] = useState('Questions about a new prescription');
  const [sessionSubtitle, setSessionSubtitle] = useState('Started yesterday');
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Initial messages matching Screenshot 2
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-1',
      sender: 'user',
      timestamp: 'Yesterday at 16:42',
      text: 'I was given a new prescription today and I am not sure how to take it. What should I ask before I start?'
    },
    {
      id: 'msg-2',
      sender: 'assistant',
      timestamp: 'Yesterday at 16:42',
      text: "I can't see your prescription, so I can't tell you the dose or timing. Your pharmacist or the doctor who prescribed it can confirm those. These questions are a good starting point:",
      points: [
        'What is this medicine for, and how soon should I notice a difference?',
        'How much should I take, how often, and with or without food?',
        'What should I do if I miss a dose?',
        'Are there side effects I should watch for, and which ones mean I should call you?',
        'Does it interact with other medicines or supplements I take?'
      ],
      guidanceNote: 'This is general guidance, not based on your records. Add your medications in Health records for answers that fit you.',
      sources: ['National Formulary Clinical Guidelines', 'Primary Care Pharmacology Protocol']
    }
  ]);

  // Handle URL query parameters or custom topics
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const topic = params.get('topic');
    const query = params.get('q');

    if (topic === 'blood-test') {
      setConversationTitle('Understanding a blood test report');
      setSessionSubtitle('Started Monday');
      setMessages([
        {
          id: 'bt-1',
          sender: 'user',
          timestamp: 'Monday at 10:15',
          text: 'What do my blood test results mean? The report says Hemoglobin is 11.2 and WBC is 8,500.'
        },
        {
          id: 'bt-2',
          sender: 'assistant',
          timestamp: 'Monday at 10:15',
          text: 'Laboratory reference ranges can vary slightly between diagnostic facilities. Here is a general interpretation to discuss with your physician:',
          points: [
            'Hemoglobin (11.2 g/dL): Slightly below standard adult reference (typical 12.0–15.5 g/dL for women, 13.5–17.5 g/dL for men). This may suggest mild anemia.',
            'White Blood Cell Count (8,500/µL): Well within typical adult reference range (4,000–11,000/µL), indicating normal immune baseline.',
            'What to ask: Ask your doctor if iron studies, ferritin, or dietary adjustments are recommended.'
          ],
          guidanceNote: 'Lab results should always be interpreted in the context of symptoms, medical history, and clinical exam.',
          sources: ['Standard Hematology Diagnostic Reference', 'Primary Care Practice Parameters']
        }
      ]);
    } else if (topic === 'follow-up') {
      setConversationTitle('Preparing for a follow-up visit');
      setSessionSubtitle('Last week');
      setMessages([
        {
          id: 'fu-1',
          sender: 'user',
          timestamp: 'Last week',
          text: 'How should I organize my questions for my cardiology follow-up visit next Tuesday?'
        },
        {
          id: 'fu-2',
          sender: 'assistant',
          timestamp: 'Last week',
          text: 'To get the most out of your consultation, organize your notes into three clear categories:',
          points: [
            'Symptom changes: Note any recurrence of palpitations, shortness of breath on exertion, or ankle swelling.',
            'Daily logs: Bring your home blood pressure and pulse logs recorded over the past 2 weeks.',
            'Medication tolerance: Mention any lightheadedness, fatigue, or side effects experienced since starting treatment.'
          ],
          guidanceNote: 'Bringing an up-to-date medication list helps prevent adverse drug interactions.',
          sources: ['Cardiology Consultation Best Practices']
        }
      ]);
    } else if (query) {
      setConversationTitle(query.slice(0, 40) + (query.length > 40 ? '…' : ''));
      setSessionSubtitle('Just now');
      handleUserSubmit(query);
    }
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleCopy = (id: string, textToCopy: string) => {
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleLike = (id: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === id ? { ...m, liked: !m.liked, disliked: false } : m
      )
    );
  };

  const handleDislike = (id: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === id ? { ...m, disliked: !m.disliked, liked: false } : m
      )
    );
  };

  const handleSaveQuestions = (id: string) => {
    setMessages(prev =>
      prev.map(m =>
        m.id === id ? { ...m, saved: !m.saved } : m
      )
    );
    setSaveSuccessNotice('Questions saved to your doctor visit checklist!');
    setTimeout(() => setSaveSuccessNotice(null), 3500);
  };

  const handleNewConversation = () => {
    setConversationTitle('New health consultation');
    setSessionSubtitle('Just now');
    setMessages([
      {
        id: 'new-1',
        sender: 'assistant',
        timestamp: 'Just now',
        text: 'Hello. How can I assist you with your health today? You can ask about medications, test reports, symptoms, or preparing for an appointment.'
      }
    ]);
  };

  const handleExportSummary = () => {
    const summaryText = messages
      .map(
        m =>
          `[${m.sender === 'user' ? 'Patient' : 'MediFlash'} - ${m.timestamp}]\n${m.text}${
            m.points ? '\n' + m.points.map((p, i) => `${i + 1}. ${p}`).join('\n') : ''
          }\n`
      )
      .join('\n---\n\n');

    const blob = new Blob([summaryText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mediflash-summary-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUserSubmit = (overrideText?: string) => {
    const textToSend = overrideText || inputText;
    if (!textToSend.trim()) return;

    const userMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'user',
      timestamp: 'Just now',
      text: textToSend.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) setInputText('');
    setIsTyping(true);

    // Simulate clinical AI response generation with verified structure
    setTimeout(() => {
      const qLower = textToSend.toLowerCase();
      let responseText = "Here is clinical information regarding your inquiry:";
      let points: string[] = [
        "Consult your prescribing physician or pharmacist before modifying any dosage or schedule.",
        "Keep a daily log of when you take your medication and any symptoms experienced.",
        "If you experience sudden severe reactions like swelling or breathing difficulty, seek emergency care immediately."
      ];
      let guidance = "This response is AI-generated for informational guidance only and is not a clinical diagnosis.";
      let sources = ["National Health Service Guidance", "Clinical Drug Safety Compendium"];

      if (qLower.includes('side effect') || qLower.includes('dizzy') || qLower.includes('nausea')) {
        responseText = "When monitoring for medication side effects, medical guidelines recommend evaluating the severity and duration:";
        points = [
          "Common mild reactions (mild nausea, dry mouth) often subside within 3 to 5 days as your body adapts.",
          "Moderate reactions (persistent dizziness, rash, digestive upset) warrant a call to your clinic or pharmacist.",
          "Red-flag reactions (facial swelling, wheezing, hives, chest tightness) require immediate emergency assistance (call 112)."
        ];
        guidance = "Always report new or worsening symptoms to your healthcare provider.";
      } else if (qLower.includes('food') || qLower.includes('eat') || qLower.includes('milk') || qLower.includes('empty')) {
        responseText = "Taking medications with or without food affects how active compounds are absorbed into the bloodstream:";
        points = [
          "Medications labeled 'take with food' protect the stomach lining or require dietary fats for optimal absorption.",
          "Medications labeled 'take on an empty stomach' should be taken 1 hour before or 2 hours after a meal with a full glass of water.",
          "Certain foods (grapefruit juice, calcium-rich dairy) can interact with specific antibiotics and blood pressure drugs."
        ];
        sources = ["Clinical Pharmacokinetics Handbook"];
      } else if (qLower.includes('miss') || qLower.includes('forgot')) {
        responseText = "If you realize you have missed a scheduled dose, general medical guidance advises:";
        points = [
          "Take the missed dose as soon as you remember, unless it is already close to your next scheduled dose.",
          "Never double up on doses or take two pills at once to make up for a missed one.",
          "Check your prescription label or patient information leaflet for medicine-specific guidance."
        ];
      }

      const assistantMsg: Message = {
        id: `msg-resp-${Date.now()}`,
        sender: 'assistant',
        timestamp: 'Just now',
        text: responseText,
        points,
        guidanceNote: guidance,
        sources
      };

      setMessages(prev => [...prev, assistantMsg]);
      setIsTyping(false);
    }, 900);
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-8rem)] max-w-4xl mx-auto font-sans pb-12">
      {/* Top Header matching Screenshot 2 */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-[#dce4e3] gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#14201f] tracking-tight">
            {conversationTitle}
          </h1>
          <p className="text-xs sm:text-sm text-[#4b5b5a] mt-0.5">
            {sessionSubtitle}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleNewConversation}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#dce4e3] hover:bg-slate-50 text-[#14201f] text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0f766e]" />
            <span>New conversation</span>
          </button>

          <button
            type="button"
            onClick={handleExportSummary}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white border border-[#dce4e3] hover:bg-slate-50 text-[#14201f] text-xs sm:text-sm font-semibold rounded-lg shadow-2xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-[#0f766e]" />
            <span>Export summary</span>
          </button>
        </div>
      </div>

      {/* Acute Emergency Banner Switcher */}
      <div className="my-4 p-3 bg-[#fff4db] border border-[#dce4e3] rounded-lg flex items-center justify-between text-xs text-[#5a3b00]">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-[#5a3b00] shrink-0" />
          <span>Experiencing acute chest pain, shortness of breath, or emergency symptoms?</span>
        </div>
        <button
          onClick={() => navigate('/assessment')}
          className="font-bold underline hover:text-[#14201f] shrink-0 ml-2"
        >
          Open Emergency Clinical Triage →
        </button>
      </div>

      {/* Notification Toast for Save Action */}
      {saveSuccessNotice && (
        <div className="p-3 bg-[#eef7ee] border border-[#1b6e3c] text-[#1b6e3c] text-xs font-semibold rounded-lg mb-4 flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{saveSuccessNotice}</span>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="flex-1 space-y-6 py-6">
        {messages.map(msg => {
          if (msg.sender === 'user') {
            return (
              <div key={msg.id} className="flex justify-end">
                <div className="bg-[#e6f2f1] text-[#14201f] rounded-2xl rounded-tr-xs px-5 py-4 max-w-xl text-base leading-relaxed border border-[#dce4e3]/40 shadow-2xs">
                  {msg.text}
                </div>
              </div>
            );
          }

          // Assistant Message matching Screenshot 2
          return (
            <div key={msg.id} className="flex flex-col gap-3 max-w-2xl text-[#14201f]">
              {/* Header: Square Teal + Icon, MediFlash name, AI-generated badge */}
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded bg-[#0f766e] text-white flex items-center justify-center shrink-0 shadow-2xs">
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <span className="font-bold text-sm text-[#14201f]">MediFlash</span>
                <span className="text-[11px] font-medium text-[#4b5b5a] bg-[#f0f4f4] border border-[#dce4e3] px-2 py-0.5 rounded-full">
                  AI-generated
                </span>
              </div>

              {/* Message Body */}
              <div className="space-y-3.5 pl-8 text-sm sm:text-base text-[#14201f] leading-relaxed">
                <p>{msg.text}</p>

                {/* Ordered List of Points */}
                {msg.points && msg.points.length > 0 && (
                  <ol className="space-y-2.5 list-decimal pl-5 text-[#14201f]">
                    {msg.points.map((pt, idx) => (
                      <li key={idx} className="pl-1">
                        {pt}
                      </li>
                    ))}
                  </ol>
                )}

                {/* Callout Card: How sure is this? */}
                {msg.guidanceNote && (
                  <div className="p-4 bg-[#f7f9f9] border border-[#dce4e3] rounded-xl flex items-start gap-3 text-xs sm:text-sm text-[#4b5b5a] mt-4">
                    <Info className="w-4 h-4 text-[#4b5b5a] shrink-0 mt-0.5" />
                    <p>
                      <strong className="text-[#14201f] font-semibold">How sure is this? </strong>
                      {msg.guidanceNote}
                    </p>
                  </div>
                )}

                {/* Sources Line */}
                {msg.sources && msg.sources.length > 0 && (
                  <div className="text-xs text-[#4b5b5a] pt-1">
                    <span>Sources: </span>
                    {msg.sources.map((src, i) => (
                      <span key={i}>
                        <button
                          type="button"
                          onClick={() => navigate('/privacy')}
                          className="text-[#0b5f58] hover:underline hover:text-[#0f766e] inline-block font-medium"
                        >
                          [{src}]
                        </button>
                        {i < msg.sources!.length - 1 && ' · '}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action Icons Row: Copy, Thumbs, Save Questions */}
                <div className="flex flex-wrap items-center gap-3 pt-2 text-[#4b5b5a]">
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, `${msg.text}\n\n${msg.points?.join('\n') || ''}`)}
                    className="p-1.5 hover:text-[#14201f] hover:bg-slate-100 rounded-md transition-colors"
                    title="Copy response"
                    aria-label="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <Check className="w-4 h-4 text-[#1b6e3c]" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLike(msg.id)}
                    className={`p-1.5 rounded-md transition-colors ${
                      msg.liked ? 'text-[#0f766e] bg-[#e6f2f1]' : 'hover:text-[#14201f] hover:bg-slate-100'
                    }`}
                    title="Helpful response"
                    aria-label="Thumbs up"
                  >
                    <ThumbsUp className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDislike(msg.id)}
                    className={`p-1.5 rounded-md transition-colors ${
                      msg.disliked ? 'text-[#b42318] bg-rose-50' : 'hover:text-[#14201f] hover:bg-slate-100'
                    }`}
                    title="Not helpful"
                    aria-label="Thumbs down"
                  >
                    <ThumbsDown className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveQuestions(msg.id)}
                    className={`text-xs sm:text-sm font-semibold transition-colors ml-2 ${
                      msg.saved
                        ? 'text-[#1b6e3c]'
                        : 'text-[#0b5f58] hover:text-[#0f766e] hover:underline'
                    }`}
                  >
                    {msg.saved ? '✓ Saved for my visit' : 'Save questions for my visit'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {/* Typing State Indicator */}
        {isTyping && (
          <div className="flex items-center gap-2 text-xs text-[#4b5b5a] pl-8">
            <div className="w-2 h-2 rounded-full bg-[#0f766e] animate-ping" />
            <span>MediFlash is reviewing clinical guidelines…</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Bottom Input Area matching Screenshot 2 */}
      <div className="sticky bottom-0 pt-4 bg-[#f7f9f9]/90 backdrop-blur-xs">
        <form
          onSubmit={e => {
            e.preventDefault();
            handleUserSubmit();
          }}
          className="bg-white border border-[#dce4e3] rounded-2xl shadow-sm p-2 sm:p-3 flex items-center gap-2 focus-within:border-[#0f766e] focus-within:ring-2 focus-within:ring-[#0f766e] transition-all"
        >
          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Ask a follow-up question"
            className="flex-1 px-3 py-2 text-sm sm:text-base text-[#14201f] placeholder:text-[#6b7c7a] bg-transparent border-none outline-none focus:ring-0"
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-lg bg-[#0f766e] hover:bg-[#0b5f58] disabled:opacity-40 disabled:hover:bg-[#0f766e] text-white flex items-center justify-center transition-colors shrink-0 shadow-2xs"
            aria-label="Send message"
          >
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </form>

        {/* Medical disclaimer note below input matching Screenshot 2 */}
        <p className="text-xs text-center text-[#4b5b5a] mt-2.5">
          MediFlash gives general health information and does not replace a doctor. In an emergency, call 112.
        </p>
      </div>
    </div>
  );
};

export default AskMediFlashPage;
