import { useState, useRef, useEffect } from "react";

const C = {
  bg:"#0d1b2e", surface:"#132338", surface2:"#1a2f48", surface3:"#213858",
  border:"#2a4060", borderSoft:"#1f3352",
  ink:"#f4f7fb", muted:"#9db4cc", light:"#5a7a9b",
  teal:"#0abab5", tealDim:"rgba(10,186,181,.15)", tealBorder:"rgba(10,186,181,.35)",
  amber:"#d97706", red:"#dc2626", green:"#059669",
  font:"'DM Mono','JetBrains Mono',monospace",
  sans:"system-ui,-apple-system,sans-serif",
};

const INTENT_PROMPT = `You are the Restora dental AI assistant. Convert a dentist's natural-language request into structured JSON for case creation or modification.

SUPPORTED INTENTS:
- create_case: User wants a new patient case.
- modify_case: User wants to adjust an existing active case.
- ask_question: General dental question.
- unclear: Cannot determine intent.

TEETH NUMBERING: Universal system (1-32). Interpret ranges ("6-11") as individual teeth [6,7,8,9,10,11].

CASE TYPES: cosmetic-anterior, smile-makeover, restorative-posterior, single-implant, full-arch-implant, full-arch-restoration, single-crown, single-veneer.

ESTHETIC KEYWORDS:
- "feminine" / "youthful" / "soft" → tooth_form: "ovoid", embrasures: "open", characterization: "subtle"
- "masculine" / "strong" / "bold" → tooth_form: "square", embrasures: "closed"
- "natural" → tooth_form: "square-tapering"
- "longer by Xmm" → length_adjustment_mm: +X
- "shorter by Xmm" → length_adjustment_mm: -X
- "brighter" / "whiter" → shade: brighter than current
- "natural color" → shade: match existing

OUTPUT (JSON only, no preamble, no markdown):
{
  "intent": "create_case|modify_case|ask_question|unclear",
  "speech": "Short conversational reply to dentist (1-2 sentences max)",
  "case": {
    "patient_name": "string or null",
    "age": number or null,
    "gender": "M|F|null",
    "teeth": [array of tooth numbers],
    "case_type": "string",
    "subtype": "string",
    "parameters": {
      "tooth_form": "ovoid|square|square-tapering|triangular|null",
      "embrasures": "open|closed|progressive|null",
      "characterization": "subtle|natural|pronounced|null",
      "length_adjustment_mm": number or null,
      "width_length_ratio": number or null,
      "shade": "string or null",
      "other": "string or null"
    },
    "notes": "Any additional clinical context from the request"
  },
  "confidence": "high|medium|low"
}

If intent is "ask_question" or "unclear", return case:null.
If modify_case, only include fields that changed — leave others null.`;

export async function parseIntent(userText, currentContext = null) {
  const contextStr = currentContext ? `\nCurrent active case: ${JSON.stringify(currentContext)}` : '';
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1200,
      messages: [{
        role: "user",
        content: `${INTENT_PROMPT}${contextStr}\n\nDentist's request: "${userText}"\n\nReturn only JSON.`
      }]
    })
  });
  const data = await res.json();
  const text = data.content?.map(i => i.text || "").join("\n") || "";
  const clean = text.replace(/```json\n?|```\n?/g, "").trim();
  try { return { ok:true, data:JSON.parse(clean) }; }
  catch (e) { return { ok:false, raw:clean, error:e.message }; }
}

export default function AIAssistant({ onCreateCase, onModifyCase, navigate }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);  // { role, text, meta? }
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [supportsVoice, setSupportsVoice] = useState(false);
  const recognitionRef = useRef(null);
  const scrollRef = useRef(null);

  // Init Web Speech API
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;
    setSupportsVoice(true);
    const rec = new SpeechRecognition();
    rec.continuous = false; rec.interimResults = true; rec.lang = "en-US";
    let finalText = "";
    rec.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) finalText += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setInput(finalText + interim);
    };
    rec.onerror = (e) => { console.error("Speech error:", e); setListening(false); };
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, thinking]);

  function toggleVoice() {
    if (!recognitionRef.current) return;
    if (listening) {
      recognitionRef.current.stop();
      setListening(false);
    } else {
      setInput("");
      recognitionRef.current.start();
      setListening(true);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || thinking) return;
    if (listening) { recognitionRef.current?.stop(); setListening(false); }
    setMessages(m => [...m, { role:"user", text }]);
    setInput("");
    setThinking(true);
    try {
      const res = await parseIntent(text);
      if (!res.ok) {
        setMessages(m => [...m, { role:"assistant", text:"Sorry, I couldn't parse that. Try again?" }]);
      } else {
        const d = res.data;
        setMessages(m => [...m, { role:"assistant", text:d.speech || "Done.", meta:d }]);
        // Act on intent
        if (d.intent === "create_case" && d.case && d.case.patient_name) {
          onCreateCase?.(d.case);
        } else if (d.intent === "modify_case" && d.case) {
          onModifyCase?.(d.case);
        }
      }
    } catch (e) {
      setMessages(m => [...m, { role:"assistant", text:"Network error. Try again." }]);
    }
    setThinking(false);
  }

  if (!open) {
    return (
      <button onClick={()=>setOpen(true)}
        aria-label="Open AI Assistant"
        style={{
          position:"fixed", bottom:20, right:20, zIndex:999,
          width:64, height:64, borderRadius:"50%",
          background:`linear-gradient(135deg, ${C.teal}, #0080cc)`,
          border:"none", cursor:"pointer",
          boxShadow:`0 8px 32px ${C.teal}80`,
          display:"flex", alignItems:"center", justifyContent:"center",
          fontSize:26, color:"white",
        }}>
        ✨
      </button>
    );
  }

  const samples = [
    "New case: John Doe 40yo male, #6–11 veneers, feminine and youthful",
    "Patient wants teeth 1mm longer",
    "Change shade to BL2",
    "Tooth #3 crown for Maria Lopez, 55F",
  ];

  return (
    <div style={{
      position:"fixed", bottom:0, right:0, zIndex:998,
      width:"min(420px, 100vw)",
      height:"min(620px, 100vh)",
      maxHeight:"100vh",
      background:C.surface,
      borderTop:`1px solid ${C.border}`, borderLeft:`1px solid ${C.border}`,
      borderRadius:"16px 0 0 0",
      display:"flex", flexDirection:"column",
      boxShadow:`0 -8px 32px rgba(0,0,0,.6)`,
      fontFamily:C.sans,
    }}>
      {/* Header */}
      <div style={{ padding:"16px 18px", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", gap:12, flexShrink:0 }}>
        <div style={{ width:36, height:36, borderRadius:"50%", background:`linear-gradient(135deg,${C.teal},#0080cc)`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, color:"white" }}>✨</div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:15, fontWeight:700, color:C.ink }}>Restora AI Assistant</div>
          <div style={{ fontSize:11, color:C.teal }}>Voice + text · Case builder</div>
        </div>
        <button onClick={()=>setOpen(false)} aria-label="Close"
          style={{ width:36, height:36, borderRadius:8, border:"none", background:C.surface2, color:C.muted, cursor:"pointer", fontSize:18 }}>✕</button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} style={{ flex:1, overflow:"auto", padding:"16px 18px", display:"flex", flexDirection:"column", gap:12 }}>
        {messages.length === 0 && (
          <div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:14, lineHeight:1.6 }}>
              Speak or type to create and modify cases. Examples:
            </div>
            {samples.map(s => (
              <button key={s} onClick={()=>setInput(s)}
                style={{ display:"block", width:"100%", textAlign:"left", padding:"12px 14px", marginBottom:8, borderRadius:8, border:`1px solid ${C.border}`, background:C.surface2, color:C.ink, fontSize:13, cursor:"pointer", fontFamily:C.sans, lineHeight:1.5 }}>
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
            <div style={{
              maxWidth:"88%",
              padding:"11px 14px",
              borderRadius:m.role==="user"?"14px 14px 2px 14px":"14px 14px 14px 2px",
              background:m.role==="user"?C.teal:C.surface2,
              color:m.role==="user"?"white":C.ink,
              fontSize:14, lineHeight:1.5,
            }}>
              {m.text}
              {m.meta?.intent === "create_case" && m.meta.case && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.muted, lineHeight:1.7 }}>
                  ✓ Created: <strong style={{ color:C.teal }}>{m.meta.case.patient_name}</strong><br/>
                  Teeth: {m.meta.case.teeth?.join(', ')} · {m.meta.case.subtype}
                </div>
              )}
              {m.meta?.intent === "modify_case" && m.meta.case && (
                <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${C.border}`, fontSize:11, color:C.muted }}>
                  ✓ Case modified
                </div>
              )}
            </div>
          </div>
        ))}
        {thinking && (
          <div style={{ display:"flex", alignItems:"center", gap:8, color:C.muted, fontSize:12 }}>
            <div style={{ width:8, height:8, borderRadius:"50%", background:C.teal, animation:"pulse 1.4s infinite" }}/>
            Thinking…
          </div>
        )}
      </div>

      {/* Input area */}
      <div style={{ padding:"14px 16px 20px", borderTop:`1px solid ${C.border}`, flexShrink:0 }}>
        <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
          {supportsVoice && (
            <button onClick={toggleVoice} aria-label={listening?"Stop recording":"Start voice input"}
              style={{
                width:48, height:48, borderRadius:"50%", flexShrink:0,
                border:"none", cursor:"pointer",
                background: listening ? C.red : C.surface2,
                color: listening ? "white" : C.teal,
                fontSize:20,
                boxShadow: listening ? `0 0 0 4px ${C.red}33` : "none",
                transition:"all .15s",
              }}>
              {listening ? "⏹" : "🎤"}
            </button>
          )}
          <textarea
            value={input}
            onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send();}}}
            placeholder={listening ? "Listening…" : "Speak or type a case…"}
            disabled={thinking}
            rows={1}
            style={{
              flex:1, padding:"13px 14px", borderRadius:12,
              border:`1px solid ${C.border}`, background:C.surface2,
              color:C.ink, fontSize:15, fontFamily:C.sans,
              outline:"none", resize:"none", minHeight:48, maxHeight:120,
            }}
          />
          <button onClick={send} disabled={!input.trim() || thinking}
            aria-label="Send"
            style={{
              width:48, height:48, borderRadius:"50%", flexShrink:0,
              border:"none",
              background: (!input.trim() || thinking) ? C.surface3 : C.teal,
              color:"white", fontSize:20,
              cursor:(!input.trim() || thinking)?"not-allowed":"pointer",
            }}>↑</button>
        </div>
        {!supportsVoice && (
          <div style={{ fontSize:10, color:C.muted, marginTop:8, textAlign:"center" }}>
            Voice input requires Safari or Chrome
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: .5; transform: scale(1.4); }
        }
      `}</style>
    </div>
  );
}
