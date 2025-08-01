import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  Save,
  Trash2,
  Download,
  Copy,
  Upload,
  Settings,
  Play,
  Pause,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import toast from "react-hot-toast";
import axios from "axios";

const EnhancedSpeechRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [recordingTime, setRecordingTime] = useState(0);
  const [isSupported, setIsSupported] = useState(true);
  const [language, setLanguage] = useState("en-US");
  const [isSaving, setIsSaving] = useState(false);
  const [selectedService, setSelectedService] = useState("webSpeech");
  const [services, setServices] = useState({});
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { user, supabase } = useAuth();
  const recognitionRef = useRef(null);
  const timerRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => {
    fetchSpeechConfig();
    checkBrowserSupport();
  }, []);

  const fetchSpeechConfig = async () => {
    try {
      const response = await axios.get("/api/speech/config");
      setServices(response.data.services);
    } catch (error) {
      console.error("Error fetching speech config:", error);
    }
  };

  const checkBrowserSupport = () => {
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      setIsSupported(false);
      toast.error("Speech recognition is not supported in your browser");
      return;
    }
  };

  const initializeSpeechRecognition = () => {
    if (selectedService !== "webSpeech") return;

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
  };

  const startRecording = async () => {
    if (selectedService === "webSpeech") {
      if (recognitionRef.current) {
        recognitionRef.current.start();
      }
    } else {
      // Start media recording for API services
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          audioChunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, {
            type: "audio/wav",
          });
          setAudioBlob(audioBlob);
          stream.getTracks().forEach((track) => track.stop());
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
        startTimer();
        toast.success("Recording started");
      } catch (error) {
        console.error("Error starting recording:", error);
        toast.error("Failed to start recording");
      }
    }
  };

  const stopRecording = () => {
    if (selectedService === "webSpeech") {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    } else {
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        stopTimer();
      }
    }
  };

  const processAudioFile = async () => {
    if (!audioBlob && !uploadedFile) {
      toast.error("No audio file to process");
      return;
    }

    setIsProcessing(true);
    const fileToProcess = uploadedFile || audioBlob;

    try {
      const formData = new FormData();
      formData.append("audio", fileToProcess);

      let endpoint = "";
      if (selectedService === "deepgram") {
        endpoint = "/api/speech/transcribe/deepgram";
      } else if (selectedService === "assemblyai") {
        endpoint = "/api/speech/transcribe/assemblyai";
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      const response = await axios.post(endpoint, formData, {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        const result = response.data.transcription;
        setFinalTranscript(result.text);
        toast.success(`${selectedService} transcription completed!`);
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      toast.error(`Failed to process audio with ${selectedService}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file && file.type.startsWith("audio/")) {
      setUploadedFile(file);
      toast.success("Audio file uploaded successfully");
    } else {
      toast.error("Please select a valid audio file");
    }
  };

  const playAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setIsPlaying(true);
      }
    }
  };

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

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

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (selectedService === "webSpeech") {
        initializeSpeechRecognition();
      }
      startRecording();
    }
  };

  const clearTranscript = () => {
    setTranscript("");
    setFinalTranscript("");
    setRecordingTime(0);
    setAudioBlob(null);
    setUploadedFile(null);
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
          confidence: 0.9,
          service: selectedService,
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
          <h1 className="text-3xl font-bold text-gray-900">
            Enhanced Speech Recorder
          </h1>
          <div className="flex items-center space-x-4">
            <select
              value={selectedService}
              onChange={(e) => setSelectedService(e.target.value)}
              className="input-field w-auto"
              disabled={isRecording}
            >
              <option value="webSpeech">Web Speech API</option>
              <option value="deepgram">Deepgram</option>
              <option value="assemblyai">AssemblyAI</option>
            </select>

            {selectedService === "webSpeech" && (
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="input-field w-auto"
                disabled={isRecording}
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
                <option value="it-IT">Italian</option>
                <option value="pt-BR">Portuguese</option>
                <option value="ja-JP">Japanese</option>
                <option value="ko-KR">Korean</option>
                <option value="zh-CN">Chinese</option>
              </select>
            )}
          </div>
        </div>

        {/* Service Information */}
        {services[selectedService] && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-blue-900 mb-2">
              {services[selectedService].name}
            </h3>
            <p className="text-blue-700 text-sm mb-2">
              {services[selectedService].description}
            </p>
            <div className="flex flex-wrap gap-2">
              {services[selectedService].features?.map((feature, index) => (
                <span
                  key={index}
                  className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded"
                >
                  {feature}
                </span>
              ))}
            </div>
            {!services[selectedService].configured &&
              selectedService !== "webSpeech" && (
                <p className="text-orange-600 text-sm mt-2">
                  ⚠️ {selectedService} API key not configured. Please add it to
                  your environment variables.
                </p>
              )}
          </div>
        )}

        {/* File Upload for API Services */}
        {selectedService !== "webSpeech" && (
          <div className="mb-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 mb-2">
                Upload an audio file or record new audio
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
                id="audio-upload"
              />
              <label
                htmlFor="audio-upload"
                className="btn-secondary cursor-pointer"
              >
                Choose Audio File
              </label>
              {uploadedFile && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: {uploadedFile.name}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Recording Controls */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-4 mb-4">
            <button
              onClick={toggleRecording}
              disabled={
                !user ||
                (selectedService !== "webSpeech" && !uploadedFile && !audioBlob)
              }
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

            {audioBlob && (
              <button
                onClick={isPlaying ? pauseAudio : playAudio}
                className="p-4 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-700"
              >
                {isPlaying ? (
                  <Pause className="h-6 w-6" />
                ) : (
                  <Play className="h-6 w-6" />
                )}
              </button>
            )}
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

        {/* Process Button for API Services */}
        {selectedService !== "webSpeech" &&
          (audioBlob || uploadedFile) &&
          !isRecording && (
            <div className="text-center mb-6">
              <button
                onClick={processAudioFile}
                disabled={isProcessing}
                className="btn-primary flex items-center space-x-2 mx-auto"
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Settings className="h-5 w-5" />
                    <span>Process with {selectedService}</span>
                  </>
                )}
              </button>
            </div>
          )}

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

        {/* Audio Player */}
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} />

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
                No transcript yet. Start recording or upload an audio file to
                see your speech converted to text.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedSpeechRecorder;
