import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Save, Trash2, Download, Copy } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import axios from "axios";

const SpeechRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [language, setLanguage] = useState("en-US");
  const [isSaving, setIsSaving] = useState(false);

  const { user, supabase } = useAuth();
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  const languages = [
    { code: "en-US", name: "English (US)" },
    { code: "en-GB", name: "English (UK)" },
    { code: "es-ES", name: "Spanish" },
    { code: "fr-FR", name: "French" },
    { code: "de-DE", name: "German" },
    { code: "it-IT", name: "Italian" },
    { code: "pt-BR", name: "Portuguese (Brazil)" },
    { code: "ja-JP", name: "Japanese" },
    { code: "ko-KR", name: "Korean" },
    { code: "zh-CN", name: "Chinese (Simplified)" },
  ];

  useEffect(() => {
    // Check if speech recognition is supported
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setIsSupported(false);
      toast.error("Speech recognition is not supported in your browser");
      return;
    }

    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();

    const recognition = recognitionRef.current;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = language;

    recognition.onstart = () => {
      setIsRecording(true);
      startTimer();
      toast.success("Recording started");
    };

    recognition.onresult = (event) => {
      let interimTranscript = "";
      let finalTranscript = "";

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(interimTranscript);
      setFinalTranscript((prev) => prev + finalTranscript);
    };

    recognition.onerror = (event) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "no-speech") {
        toast.error("No speech detected. Please try again.");
      } else if (event.error === "audio-capture") {
        toast.error("No microphone found. Please check your microphone.");
      } else {
        toast.error(`Speech recognition error: ${event.error}`);
      }
      stopRecording();
    };

    recognition.onend = () => {
      setIsRecording(false);
      stopTimer();
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      stopTimer();
    };
  }, [language]);

  const startTimer = () => {
    setRecordingTime(0);
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const startRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.start();
    }
  };

  const stopRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setFinalTranscript("");
    setRecordingTime(0);
  };

  const saveTranscription = async () => {
    if (!finalTranscript.trim()) {
      toast.error("No transcript to save");
      return;
    }

    setIsSaving(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await axios.post(
        "/api/transcriptions",
        {
          text: finalTranscript,
          duration: recordingTime,
          language: language,
          confidence: 0.9, // Default confidence
        },
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
          },
        }
      );

      if (response.data) {
        toast.success("Transcription saved successfully!");
        clearTranscript();
      }
    } catch (error) {
      console.error("Error saving transcription:", error);
      toast.error("Failed to save transcription");
    } finally {
      setIsSaving(false);
    }
  };

  const copyToClipboard = async () => {
    const textToCopy = finalTranscript || transcript;
    if (!textToCopy.trim()) {
      toast.error("No text to copy");
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      toast.success("Text copied to clipboard!");
    } catch (error) {
      console.error("Failed to copy text:", error);
      toast.error("Failed to copy text");
    }
  };

  const downloadTranscript = () => {
    const textToDownload = finalTranscript || transcript;
    if (!textToDownload.trim()) {
      toast.error("No text to download");
      return;
    }

    const blob = new Blob([textToDownload], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transcript-${new Date().toISOString().slice(0, 19)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Transcript downloaded!");
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs
      .toString()
      .padStart(2, "0")}`;
  };

  if (!isSupported) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="card text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Browser Not Supported
          </h2>
          <p className="text-gray-600 mb-4">
            Your browser doesn't support speech recognition. Please use Chrome,
            Edge, or Safari.
          </p>
          <a
            href="https://www.google.com/chrome/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Download Chrome
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Speech Recorder</h1>
          <div className="flex items-center space-x-4">
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input-field w-auto"
              disabled={isRecording}
            >
              {languages.map((lang) => (
                <option key={lang.code} value={lang.code}>
                  {lang.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Recording Controls */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={toggleRecording}
              disabled={!user}
              className={`p-6 rounded-full transition-all duration-200 ${
                isRecording
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : "bg-primary-600 hover:bg-primary-700 text-white"
              } ${!user ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {isRecording ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>
          </div>

          <div className="text-2xl font-mono text-gray-700 mb-2">
            {formatTime(recordingTime)}
          </div>

          <p className="text-gray-600">
            {isRecording
              ? "Recording... Speak now!"
              : "Click the microphone to start recording"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={saveTranscription}
            disabled={!finalTranscript.trim() || isSaving}
            className="btn-primary flex items-center space-x-2"
          >
            <Save className="h-5 w-5" />
            <span>{isSaving ? "Saving..." : "Save"}</span>
          </button>

          <button
            onClick={copyToClipboard}
            disabled={!finalTranscript.trim() && !transcript.trim()}
            className="btn-secondary flex items-center space-x-2"
          >
            <Copy className="h-5 w-5" />
            <span>Copy</span>
          </button>

          <button
            onClick={downloadTranscript}
            disabled={!finalTranscript.trim() && !transcript.trim()}
            className="btn-secondary flex items-center space-x-2"
          >
            <Download className="h-5 w-5" />
            <span>Download</span>
          </button>

          <button
            onClick={clearTranscript}
            disabled={!finalTranscript.trim() && !transcript.trim()}
            className="btn-secondary flex items-center space-x-2 text-red-600 hover:text-red-700"
          >
            <Trash2 className="h-5 w-5" />
            <span>Clear</span>
          </button>
        </div>

        {/* Transcript Display */}
        <div className="space-y-4">
          {finalTranscript && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Final Transcript
              </h3>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {finalTranscript}
                </p>
              </div>
            </div>
          )}

          {transcript && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Interim Transcript
              </h3>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {transcript}
                </p>
              </div>
            </div>
          )}

          {!finalTranscript && !transcript && (
            <div className="text-center py-12 text-gray-500">
              <Mic className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p>
                No transcript yet. Start recording to see your speech converted
                to text.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpeechRecorder;
